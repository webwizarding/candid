use std::sync::{Arc, Mutex};
use tokio::{
    io::{AsyncRead, AsyncReadExt, AsyncWrite, AsyncWriteExt},
    net::TcpStream,
    sync::watch,
    time::{timeout, Duration},
};
type Cipher = Arc<Mutex<snow::TransportState>>;
pub const LIMIT: usize = 2_000_000;
async fn read_frame<R: AsyncRead + Unpin>(reader: &mut R, limit: usize) -> Result<Vec<u8>, String> {
    let size = reader.read_u32().await.map_err(|_| "Peer disconnected.")? as usize;
    if size == 0 || size > limit {
        return Err("Peer frame exceeds the allowed size.".into());
    }
    let mut data = vec![0; size];
    reader
        .read_exact(&mut data)
        .await
        .map_err(|_| "Peer transfer was interrupted.")?;
    Ok(data)
}
async fn write_frame<W: AsyncWrite + Unpin>(writer: &mut W, data: &[u8]) -> Result<(), String> {
    writer
        .write_u32(data.len() as u32)
        .await
        .map_err(|_| "Peer disconnected.")?;
    writer
        .write_all(data)
        .await
        .map_err(|_| "Peer transfer was interrupted.".into())
}
fn noise(key: &[u8; 32], club: &str, initiator: bool) -> Result<snow::HandshakeState, String> {
    let prologue = format!("candid-club-tor-v1:{club}");
    let builder = snow::Builder::new(
        "Noise_NNpsk0_25519_ChaChaPoly_SHA256"
            .parse()
            .map_err(|_| "Invalid encryption configuration.")?,
    )
    .psk(0, key)
    .map_err(|_| "Invalid invite key.")?
    .prologue(prologue.as_bytes())
    .map_err(|_| "Invalid encryption context.")?;
    (if initiator {
        builder.build_initiator()
    } else {
        builder.build_responder()
    })
    .map_err(|_| "Could not initialize session encryption.".into())
}
pub async fn handshake(
    mut stream: TcpStream,
    key: &[u8; 32],
    club: &str,
    initiator: bool,
) -> Result<(TcpStream, Cipher), String> {
    timeout(Duration::from_secs(20), async {
        let mut noise = noise(key, club, initiator)?;
        let mut buffer = vec![0; 4096];
        if initiator {
            let size = noise
                .write_message(b"candid-v1", &mut buffer)
                .map_err(|_| "Could not authenticate the invite.")?;
            write_frame(&mut stream, &buffer[..size]).await?;
            let reply = read_frame(&mut stream, 4096).await?;
            let size = noise
                .read_message(&reply, &mut buffer)
                .map_err(|_| "Invite authentication failed. Check the code with your peer.")?;
            if &buffer[..size] != b"candid-v1" {
                return Err("Unexpected peer protocol.".into());
            }
        } else {
            let request = read_frame(&mut stream, 4096).await?;
            let size = noise
                .read_message(&request, &mut buffer)
                .map_err(|_| "Invite authentication failed.")?;
            if &buffer[..size] != b"candid-v1" {
                return Err("Unexpected peer protocol.".into());
            }
            let size = noise
                .write_message(b"candid-v1", &mut buffer)
                .map_err(|_| "Could not authenticate the peer.")?;
            write_frame(&mut stream, &buffer[..size]).await?;
        }
        let cipher = Arc::new(Mutex::new(
            noise
                .into_transport_mode()
                .map_err(|_| "Session authentication did not finish.")?,
        ));
        // A protected confirmation proves that the guest received the host handshake.
        if initiator {
            encrypted_write(&mut stream, &cipher, b"ready").await?
        } else {
            if encrypted_read(&mut stream, &cipher).await? != b"ready" {
                return Err("Peer did not confirm the connection.".into());
            }
        }
        Ok((stream, cipher))
    })
    .await
    .map_err(|_| "Peer authentication timed out. Check the invite and try again.".to_string())?
}
async fn encrypted_write<W: AsyncWrite + Unpin>(
    writer: &mut W,
    cipher: &Cipher,
    plain: &[u8],
) -> Result<(), String> {
    let mut data = vec![0; plain.len() + 16];
    let length = cipher
        .lock()
        .map_err(|_| "Session encryption failed.")?
        .write_message(plain, &mut data)
        .map_err(|_| "Session encryption failed.")?;
    timeout(
        Duration::from_secs(120),
        write_frame(writer, &data[..length]),
    )
    .await
    .map_err(|_| "Peer transfer timed out.")?
}
async fn encrypted_read<R: AsyncRead + Unpin>(
    reader: &mut R,
    cipher: &Cipher,
) -> Result<Vec<u8>, String> {
    let data = timeout(Duration::from_secs(120), read_frame(reader, 33000))
        .await
        .map_err(|_| "Peer stopped responding.")??;
    let mut plain = vec![0; data.len()];
    let length = cipher
        .lock()
        .map_err(|_| "Session decryption failed.")?
        .read_message(&data, &mut plain)
        .map_err(|_| "Peer message authentication failed. Connection stopped.")?;
    plain.truncate(length);
    Ok(plain)
}
pub async fn exchange(
    stream: TcpStream,
    cipher: Cipher,
    mut outgoing: watch::Receiver<Option<String>>,
    club: &str,
    receive: impl Fn(String) + Send,
) -> Result<(), String> {
    let (mut reader, mut writer) = stream.into_split();
    let send = async {
        let mut heartbeat = tokio::time::interval(Duration::from_secs(25));
        loop {
            let packet = outgoing.borrow_and_update().clone();
            if let Some(packet) = packet {
                let mut header = vec![1];
                header.extend_from_slice(&(packet.len() as u32).to_be_bytes());
                encrypted_write(&mut writer, &cipher, &header).await?;
                for chunk in packet.as_bytes().chunks(16000) {
                    let mut plain = Vec::with_capacity(chunk.len() + 1);
                    plain.push(2);
                    plain.extend_from_slice(chunk);
                    encrypted_write(&mut writer, &cipher, &plain).await?;
                }
                encrypted_write(&mut writer, &cipher, &[3]).await?;
            }
            // Heartbeats do not cause repeated snapshot sends.
            loop {
                tokio::select! {
                    result=outgoing.changed()=> {if result.is_err(){return Ok::<(),String>(())} break},
                    _=heartbeat.tick()=>encrypted_write(&mut writer,&cipher,&[0]).await?,
                }
            }
        }
    };
    let recv = async {
        let mut incoming = Vec::new();
        let mut expected = None;
        loop {
            let plain = encrypted_read(&mut reader, &cipher).await?;
            match plain.first() {
                Some(0) if plain.len() == 1 => {}
                Some(1) if plain.len() == 5 && expected.is_none() => {
                    let length = u32::from_be_bytes(plain[1..5].try_into().unwrap()) as usize;
                    if length == 0 || length > LIMIT {
                        return Err("Club snapshot exceeds the 2 MB limit.".into());
                    }
                    expected = Some(length);
                    incoming.clear();
                }
                Some(2) if expected.is_some() && plain.len() > 1 => {
                    if incoming.len() + plain.len() - 1 > expected.unwrap() {
                        return Err("Peer sent excess snapshot data.".into());
                    }
                    incoming.extend_from_slice(&plain[1..]);
                }
                Some(3) if plain.len() == 1 && expected == Some(incoming.len()) => {
                    let text = String::from_utf8(std::mem::take(&mut incoming))
                        .map_err(|_| "Peer sent invalid text.")?;
                    super::validate_packet(&text, Some(club))?;
                    expected = None;
                    receive(text);
                }
                _ => return Err("Peer sent an invalid snapshot sequence.".into()),
            }
        }
        #[allow(unreachable_code)]
        Ok::<(), String>(())
    };
    tokio::try_join!(send, recv)?;
    Ok(())
}
#[cfg(test)]
mod tests {
    use super::*;
    #[tokio::test]
    async fn authenticated_transfer_and_wrong_secret() {
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let address = listener.local_addr().unwrap();
        let host = tokio::spawn(async move {
            let (stream, _) = listener.accept().await.unwrap();
            handshake(stream, &[7; 32], "club", false).await
        });
        let guest = handshake(
            TcpStream::connect(address).await.unwrap(),
            &[7; 32],
            "club",
            true,
        )
        .await
        .unwrap();
        let host = host.await.unwrap().unwrap();
        let mut encrypted = [0; 128];
        let size = guest
            .1
            .lock()
            .unwrap()
            .write_message(b"private club", &mut encrypted)
            .unwrap();
        assert!(!encrypted[..size].windows(12).any(|w| w == b"private club"));
        let mut plain = [0; 128];
        assert!(host
            .1
            .lock()
            .unwrap()
            .read_message(&encrypted[..size], &mut plain)
            .is_ok());
        assert!(
            host.1
                .lock()
                .unwrap()
                .read_message(&encrypted[..size], &mut plain)
                .is_err(),
            "reject replay"
        );
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let address = listener.local_addr().unwrap();
        let host = tokio::spawn(async move {
            let (stream, _) = listener.accept().await.unwrap();
            handshake(stream, &[7; 32], "club", false).await
        });
        assert!(handshake(
            TcpStream::connect(address).await.unwrap(),
            &[9; 32],
            "club",
            true
        )
        .await
        .is_err());
        assert!(host.await.unwrap().is_err());
    }
    #[tokio::test]
    async fn concurrent_snapshots_are_bounded_and_authenticated() {
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let address = listener.local_addr().unwrap();
        let host = tokio::spawn(async move {
            let (stream, _) = listener.accept().await.unwrap();
            handshake(stream, &[7; 32], "club", false).await.unwrap()
        });
        let guest = handshake(
            TcpStream::connect(address).await.unwrap(),
            &[7; 32],
            "club",
            true,
        )
        .await
        .unwrap();
        let host = host.await.unwrap();
        let packet=serde_json::json!({"format":"calender-club","version":1,"club":{"id":"club","name":"Synthetic transport check","records":[{"body":"x".repeat(400000),"deleted":true}]}}).to_string();
        let (_h_tx, h_rx) = watch::channel(Some(packet.clone()));
        let (_g_tx, g_rx) = watch::channel(Some(packet.clone()));
        let (done, mut received) = tokio::sync::mpsc::unbounded_channel();
        let host_done = done.clone();
        let h = tokio::spawn(async move {
            exchange(host.0, host.1, h_rx, "club", move |p| {
                host_done.send(p).unwrap();
            })
            .await
        });
        let g = tokio::spawn(async move {
            exchange(guest.0, guest.1, g_rx, "club", move |p| {
                done.send(p).unwrap();
            })
            .await
        });
        for _ in 0..2 {
            assert_eq!(
                timeout(Duration::from_secs(5), received.recv())
                    .await
                    .unwrap()
                    .unwrap(),
                packet
            );
        }
        h.abort();
        g.abort();
    }
}
