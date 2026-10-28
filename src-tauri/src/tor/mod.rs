//! Opt-in desktop Tor transport. No Tor process is bundled, launched, or reconfigured.
mod control;
#[cfg(test)]
mod live_test;
mod transport;
use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use serde::{Deserialize, Serialize};
use std::{
    sync::Mutex,
    time::{SystemTime, UNIX_EPOCH},
};
use tauri::{Emitter, Manager};
use tokio::{
    net::TcpListener,
    sync::watch,
    time::{Duration, Instant},
};
const PREFIX: &str = "candid-tor-v1:";
#[derive(Serialize, Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
struct Invite {
    onion: String,
    key: String,
    club_id: String,
    expires: u64,
}
fn now() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}
pub fn valid_onion(address: &str) -> bool {
    address.len() == 62
        && address.ends_with("d.onion")
        && address
            .bytes()
            .take(56)
            .all(|b| b.is_ascii_lowercase() || (b'2'..=b'7').contains(&b))
}
fn read_invite(code: &str) -> Result<(Invite, [u8; 32]), String> {
    if code.len() > 2048 {
        return Err("The Tor invite is too large.".into());
    }
    let bytes = URL_SAFE_NO_PAD
        .decode(
            code.trim()
                .strip_prefix(PREFIX)
                .ok_or("Paste a complete Candid Tor invite.")?,
        )
        .map_err(|_| "Invalid Tor invite encoding.")?;
    let invite: Invite =
        serde_json::from_slice(&bytes).map_err(|_| "Invalid or unsupported Tor invite.")?;
    if !valid_onion(&invite.onion) || invite.club_id.is_empty() || invite.club_id.len() > 100 {
        return Err("The Tor invite has an invalid destination.".into());
    }
    let time = now();
    if invite.expires <= time || invite.expires > time + 660 {
        return Err(
            "The Tor invite expired or the device clocks disagree. Ask for a fresh invite."
                .to_string(),
        );
    }
    let key: [u8; 32] = URL_SAFE_NO_PAD
        .decode(&invite.key)
        .map_err(|_| "Invalid invite key.")?
        .try_into()
        .map_err(|_| "Invalid invite key.")?;
    Ok((invite, key))
}
pub fn validate_packet(text: &str, club: Option<&str>) -> Result<String, String> {
    if text.len() > transport::LIMIT {
        return Err("Club snapshot exceeds the 2 MB limit.".into());
    }
    let packet: serde_json::Value =
        serde_json::from_str(text).map_err(|_| "Invalid club snapshot.")?;
    if packet["format"] != "calender-club" || packet["version"] != 1 {
        return Err("Unsupported club snapshot.".into());
    }
    let id = packet["club"]["id"]
        .as_str()
        .ok_or("Invalid club identifier.")?;
    let name = packet["club"]["name"]
        .as_str()
        .ok_or("Invalid club name.")?;
    let records = packet["club"]["records"]
        .as_array()
        .ok_or("Invalid club records.")?;
    if id.is_empty()
        || id.len() > 100
        || club.is_some_and(|c| c != id)
        || name.trim().is_empty()
        || name.len() > 400
        || records.len() > 5000
    {
        return Err("The snapshot does not match this club or exceeds its limits.".into());
    }
    Ok(id.to_string())
}
#[derive(Clone, Serialize)]
struct Event {
    id: String,
    state: String,
    message: String,
    data: Option<String>,
}
fn emit(app: &tauri::AppHandle, id: &str, state: &str, message: &str, data: Option<String>) {
    let _ = app.emit_to(
        "main",
        "candid-tor-sync",
        Event {
            id: id.into(),
            state: state.into(),
            message: message.into(),
            data,
        },
    );
}
struct Session {
    id: String,
    club: String,
    job: tauri::async_runtime::JoinHandle<()>,
    outgoing: watch::Sender<Option<String>>,
}
impl Drop for Session {
    fn drop(&mut self) {
        self.job.abort();
    }
}
#[derive(Default)]
pub struct TorState(Mutex<Option<Session>>);
pub fn stop_all(app: &tauri::AppHandle) {
    if let Ok(mut state) = app.state::<TorState>().0.lock() {
        state.take();
    }
}
fn valid_session(id: &str) -> Result<(), String> {
    if id.len() < 16 || id.len() > 80 || !id.bytes().all(|b| b.is_ascii_alphanumeric() || b == b'-')
    {
        return Err("Invalid pairing session.".into());
    }
    Ok(())
}
fn install(
    state: &TorState,
    id: String,
    club: String,
    outgoing: watch::Sender<Option<String>>,
    job: tauri::async_runtime::JoinHandle<()>,
) -> Result<(), String> {
    let mut state = state
        .0
        .lock()
        .map_err(|_| "Could not create a Tor session.")?;
    state.take();
    *state = Some(Session {
        id,
        club,
        job,
        outgoing,
    });
    Ok(())
}
async fn host_session(
    id: String,
    packet: String,
    control_port: u16,
    socks_port: u16,
    outgoing: watch::Receiver<Option<String>>,
    notify: impl Fn(&str, &str, Option<String>) + Send + Sync,
) -> Result<(), String> {
    let club = validate_packet(&packet, None)?;
    notify("starting", "Checking your local Tor runtime…", None);
    let mut control = control::Control::connect(control_port).await?;
    let listener = TcpListener::bind((std::net::Ipv4Addr::LOCALHOST, 0))
        .await
        .map_err(|_| "Could not open the local club listener.")?;
    let onion = control
        .service(
            listener
                .local_addr()
                .map_err(|_| "Local listener is unavailable.")?
                .port(),
        )
        .await?;
    notify("starting", "Tor is publishing the temporary address…", None);
    let key = control::random32()?;
    // A successful SOCKS self-probe verifies reachability before offering an invite.
    let mut ready = false;
    for _ in 0..3 {
        if let Ok(stream) = control::socks(socks_port, &onion, &id).await {
            drop(stream);
            ready = true;
            break;
        }
        tokio::time::sleep(Duration::from_secs(3)).await;
    }
    if !ready {
        return Err("Tor could not reach the new onion service. Check bootstrap, SOCKS settings and network access, then try again.".into());
    }
    // Discard the self-probe connection; it has no application credentials.
    let _ = tokio::time::timeout(Duration::from_secs(2), listener.accept()).await;
    let invite = Invite {
        onion,
        key: URL_SAFE_NO_PAD.encode(key),
        club_id: club.clone(),
        expires: now() + 600,
    };
    let code = format!(
        "{PREFIX}{}",
        URL_SAFE_NO_PAD
            .encode(serde_json::to_vec(&invite).map_err(|_| "Could not create an invite.")?)
    );
    notify(
        "invite",
        "Invite ready · one peer · expires in 10 minutes",
        Some(code),
    );
    let deadline = Instant::now() + Duration::from_secs(600);
    loop {
        let authenticated = tokio::select! {
            _=tokio::time::sleep_until(deadline)=>return Err("Invite expired. Create a fresh invite to pair.".into()),
            _=control.disconnected()=>return Err("Tor control disconnected. The temporary service has closed.".into()),
            result=async {
                let (stream,_)=listener.accept().await.map_err(|_|"Local club listener closed.")?;
                transport::handshake(stream,&key,&club,false).await
            }=>result,
        };
        if let Ok((stream, cipher)) = authenticated {
            drop(listener); // Single-use invite: no further guest connections.
            notify(
                "connected",
                "Connected through Tor · encrypted club session",
                None,
            );
            tokio::select! {
                _=control.disconnected()=>return Err("Tor control disconnected. Sharing stopped.".into()),
                result=transport::exchange(stream,cipher,outgoing,&club,|text|notify("packet","Club update received through Tor",Some(text)))=>return result,
            }
        }
        // Invalid handshakes never disclose snapshots and do not consume an invite.
    }
}
#[tauri::command]
pub fn tor_host(
    app: tauri::AppHandle,
    state: tauri::State<'_, TorState>,
    id: String,
    packet: String,
    control_port: u16,
    socks_port: u16,
) -> Result<(), String> {
    valid_session(&id)?;
    let club = validate_packet(&packet, None)?;
    if control_port == 0 || socks_port == 0 {
        return Err("Choose valid Tor ports.".into());
    }
    let (send, recv) = watch::channel(Some(packet.clone()));
    let worker_id = id.clone();
    let job = tauri::async_runtime::spawn(async move {
        let result = host_session(
            worker_id.clone(),
            packet,
            control_port,
            socks_port,
            recv,
            |state, message, data| emit(&app, &worker_id, state, message, data),
        )
        .await;
        emit(
            &app,
            &worker_id,
            "closed",
            &result.err().unwrap_or("Tor session ended.".into()),
            None,
        );
    });
    install(state.inner(), id, club, send, job)
}
// Tauri commands can be called outside a Tokio task; use its runtime JoinHandle directly.
#[tauri::command]
pub fn tor_join(
    app: tauri::AppHandle,
    state: tauri::State<'_, TorState>,
    id: String,
    code: String,
    socks_port: u16,
) -> Result<(), String> {
    valid_session(&id)?;
    let (invite, key) = read_invite(&code)?;
    if socks_port == 0 {
        return Err("Choose a valid Tor SOCKS port.".into());
    }
    let club = invite.club_id.clone();
    let (send, recv) = watch::channel(None);
    let worker_id = id.clone();
    let job = tauri::async_runtime::spawn(async move {
        let result = async {
            emit(
                &app,
                &worker_id,
                "starting",
                "Connecting to the onion peer through your local Tor runtime…",
                None,
            );
            let stream = control::socks(socks_port, &invite.onion, &worker_id).await?;
            if now() >= invite.expires {
                return Err("Invite expired while connecting. Ask for a fresh invite.".into());
            }
            let (stream, cipher) =
                transport::handshake(stream, &key, &invite.club_id, true).await?;
            emit(
                &app,
                &worker_id,
                "connected",
                "Connected through Tor · review the club before joining",
                None,
            );
            transport::exchange(stream, cipher, recv, &invite.club_id, |text| {
                emit(
                    &app,
                    &worker_id,
                    "packet",
                    "Club update received through Tor",
                    Some(text),
                )
            })
            .await
        }
        .await;
        emit(
            &app,
            &worker_id,
            "closed",
            &result.err().unwrap_or("Tor session ended.".into()),
            None,
        );
    });
    install(state.inner(), id, club, send, job)
}
#[tauri::command]
pub fn tor_send(
    state: tauri::State<'_, TorState>,
    id: String,
    packet: String,
) -> Result<(), String> {
    let state = state.0.lock().map_err(|_| "Tor session unavailable.")?;
    let session = state
        .as_ref()
        .filter(|s| s.id == id)
        .ok_or("Tor session is no longer active.")?;
    validate_packet(&packet, Some(&session.club))?;
    session
        .outgoing
        .send(Some(packet))
        .map_err(|_| "The Tor peer disconnected.".into())
}
#[tauri::command]
pub fn tor_stop(state: tauri::State<'_, TorState>, id: String) {
    if let Ok(mut state) = state.0.lock() {
        if state.as_ref().is_some_and(|s| s.id == id) {
            state.take();
        }
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    fn invite() -> Invite {
        Invite {
            onion: format!("{}d.onion", "a".repeat(55)),
            key: URL_SAFE_NO_PAD.encode([3; 32]),
            club_id: "club".into(),
            expires: now() + 600,
        }
    }
    fn code(i: &Invite) -> String {
        format!(
            "{PREFIX}{}",
            URL_SAFE_NO_PAD.encode(serde_json::to_vec(i).unwrap())
        )
    }
    #[test]
    fn invite_validation() {
        assert!(read_invite(&code(&invite())).is_ok());
        let mut i = invite();
        i.expires = now() - 1;
        assert!(read_invite(&code(&i)).is_err());
        i = invite();
        i.onion = "127.0.0.1".into();
        assert!(read_invite(&code(&i)).is_err());
        i = invite();
        i.key = "weak".into();
        assert!(read_invite(&code(&i)).is_err());
        assert!(!valid_onion("http://example.onion"));
        assert!(!valid_onion(&format!("{}d.onion", "é".repeat(27) + "a")));
    }
    #[test]
    fn only_selected_club_packets() {
        let p = r#"{"format":"calender-club","version":1,"club":{"id":"club","name":"Club","records":[]}}"#;
        assert!(validate_packet(p, Some("club")).is_ok());
        assert!(validate_packet(p, Some("other")).is_err());
        assert!(validate_packet(r#"{"format":"calender-backup","version":1}"#, None).is_err());
    }
}
