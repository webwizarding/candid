//! Only authenticated loopback control; never changes torrc or other services.
use ring::{
    hmac,
    rand::{SecureRandom, SystemRandom},
};
use tokio::{
    io::{AsyncReadExt, AsyncWriteExt, BufReader},
    net::TcpStream,
    time::{timeout, Duration},
};

pub fn random32() -> Result<[u8; 32], String> {
    let mut value = [0; 32];
    SystemRandom::new()
        .fill(&mut value)
        .map_err(|_| "Secure randomness is unavailable.")?;
    Ok(value)
}
fn hex(bytes: &[u8]) -> String {
    bytes.iter().map(|b| format!("{b:02x}")).collect()
}
fn unhex(text: &str) -> Result<Vec<u8>, String> {
    if text.len() != 64 || !text.bytes().all(|c| c.is_ascii_hexdigit()) {
        return Err("Invalid Tor authentication reply.".into());
    }
    (0..text.len())
        .step_by(2)
        .map(|i| {
            u8::from_str_radix(&text[i..i + 2], 16)
                .map_err(|_| "Invalid Tor authentication reply.".into())
        })
        .collect()
}
/// Tor quoted strings use C escapes (including octal), not JSON escaping.
fn quoted(text: &str) -> Result<String, String> {
    let mut chars = text.bytes();
    if chars.next() != Some(b'"') {
        return Err("Tor did not provide a valid cookie path.".into());
    }
    let mut bytes = Vec::new();
    while let Some(c) = chars.next() {
        match c {
            b'"' => {
                return String::from_utf8(bytes).map_err(|_| "Tor cookie path is not UTF-8.".into())
            }
            b'\\' => {
                let c = chars.next().ok_or("Invalid Tor cookie path.")?;
                bytes.push(match c {
                    b'n' => b'\n',
                    b'r' => b'\r',
                    b't' => b'\t',
                    b'\\' => b'\\',
                    b'"' => b'"',
                    b'0'..=b'3' => {
                        let b = chars.next().ok_or("Invalid Tor cookie path.")?;
                        let d = chars.next().ok_or("Invalid Tor cookie path.")?;
                        if !(b'0'..=b'7').contains(&b) || !(b'0'..=b'7').contains(&d) {
                            return Err("Invalid Tor cookie path.".into());
                        }
                        (c - b'0') * 64 + (b - b'0') * 8 + d - b'0'
                    }
                    _ => return Err("Invalid Tor cookie path.".into()),
                });
            }
            _ => bytes.push(c),
        }
    }
    Err("Unterminated Tor cookie path.".into())
}
pub struct Control(BufReader<TcpStream>);
impl Control {
    async fn command(&mut self, command: &str) -> Result<Vec<String>, String> {
        timeout(Duration::from_secs(10), async {
            self.0
                .get_mut()
                .write_all(format!("{command}\r\n").as_bytes())
                .await
                .map_err(|_| "Tor control disconnected.")?;
            let mut lines = Vec::new();
            let mut total = 0;
            loop {
                let mut line = Vec::new();
                loop {
                    let c = self
                        .0
                        .read_u8()
                        .await
                        .map_err(|_| "Tor control disconnected.")?;
                    line.push(c);
                    if line.len() > 8192 {
                        return Err("Tor control reply exceeds the limit.".into());
                    }
                    if c == b'\n' {
                        break;
                    }
                }
                total += line.len();
                if total > 65536 {
                    return Err("Tor control reply exceeds the limit.".into());
                }
                let line = String::from_utf8(line).map_err(|_| "Invalid Tor control reply.")?;
                if !line.starts_with("250") {
                    return Err(
                        "Tor refused the control request. Check SAFECOOKIE control access.".into(),
                    );
                }
                let last = line.as_bytes().get(3) == Some(&b' ');
                if !last && line.as_bytes().get(3) != Some(&b'-') {
                    return Err("Unexpected Tor control reply.".into());
                }
                lines.push(line.trim_end().to_string());
                if last {
                    return Ok(lines);
                }
            }
        })
        .await
        .map_err(|_| "Tor control timed out.")?
    }
    pub async fn connect(port: u16) -> Result<Self, String> {
        if port == 0 {
            return Err("Choose a Tor control port from 1 to 65535.".into());
        }
        let stream=timeout(Duration::from_secs(3),TcpStream::connect((std::net::Ipv4Addr::LOCALHOST,port))).await
            .map_err(|_|"Tor control is not responding. Start your separate Tor runtime.")?
            .map_err(|_|"Tor control is unavailable. Start Tor with a loopback ControlPort and CookieAuthentication 1.")?;
        let mut control = Self(BufReader::new(stream));
        let info = control.command("PROTOCOLINFO 1").await?;
        let auth = info
            .iter()
            .find(|l| l.starts_with("250-AUTH "))
            .ok_or("Tor did not advertise authentication.")?;
        let methods = auth
            .split("METHODS=")
            .nth(1)
            .and_then(|v| v.split_whitespace().next())
            .ok_or("Tor authentication is unavailable.")?;
        if !methods.split(',').any(|m| m == "SAFECOOKIE") {
            return Err("Enable CookieAuthentication 1 on Tor. Candid requires SAFECOOKIE control authentication.".into());
        }
        let path = quoted(
            auth.split("COOKIEFILE=")
                .nth(1)
                .ok_or("Tor did not provide its cookie path.")?,
        )?;
        let path = std::path::Path::new(&path);
        if !path.is_absolute() {
            return Err("Tor returned an invalid cookie path.".into());
        }
        let file=tokio::fs::File::open(path).await.map_err(|_|"Candid cannot read Tor's control cookie. Run Tor as your user or check cookie-file permissions.")?;
        let mut cookie = Vec::new();
        file.take(33)
            .read_to_end(&mut cookie)
            .await
            .map_err(|_| "Could not read the Tor control cookie.")?;
        if cookie.len() != 32 {
            return Err("Tor's control cookie must contain 32 bytes.".into());
        }
        let nonce = random32()?;
        let reply = control
            .command(&format!("AUTHCHALLENGE SAFECOOKIE {}", hex(&nonce)))
            .await?;
        let field = |name: &str| -> Result<Vec<u8>, String> {
            let text = reply[0]
                .split_whitespace()
                .find_map(|s| s.strip_prefix(name))
                .ok_or("Invalid Tor authentication reply.")?;
            unhex(text)
        };
        let server_nonce = field("SERVERNONCE=")?;
        let proof = field("SERVERHASH=")?;
        let value = [cookie.as_slice(), &nonce, &server_nonce].concat();
        let key = hmac::Key::new(
            hmac::HMAC_SHA256,
            b"Tor safe cookie authentication server-to-controller hash",
        );
        hmac::verify(&key, &value, &proof)
            .map_err(|_| "Tor control could not prove its identity. Connection stopped.")?;
        let key = hmac::Key::new(
            hmac::HMAC_SHA256,
            b"Tor safe cookie authentication controller-to-server hash",
        );
        control
            .command(&format!(
                "AUTHENTICATE {}",
                hex(hmac::sign(&key, &value).as_ref())
            ))
            .await?;
        let phase = control.command("GETINFO status/bootstrap-phase").await?;
        if !phase
            .iter()
            .any(|s| s.split_whitespace().any(|word| word == "PROGRESS=100"))
        {
            return Err("Tor is still connecting to its network. Wait for bootstrap to reach 100%, then try again.".into());
        }
        Ok(control)
    }
    pub async fn service(&mut self, local_port: u16) -> Result<String, String> {
        let reply = self
            .command(&format!(
                "ADD_ONION NEW:ED25519-V3 Flags=DiscardPK Port=80,127.0.0.1:{local_port}"
            ))
            .await?;
        let id = reply
            .iter()
            .find_map(|s| s.strip_prefix("250-ServiceID="))
            .ok_or("Tor did not create an onion service.")?;
        let address = format!("{id}.onion");
        if !super::valid_onion(&address) {
            return Err("Tor returned an invalid onion address.".into());
        }
        Ok(address)
    }
    pub async fn disconnected(&mut self) {
        let _ = self.0.read_u8().await;
    }
    // No Detach flag: dropping this control socket deletes only this ephemeral service.
}

pub async fn socks(port: u16, address: &str, session: &str) -> Result<TcpStream, String> {
    if port == 0 || !super::valid_onion(address) {
        return Err("Invalid Tor destination or SOCKS port.".into());
    }
    timeout(Duration::from_secs(65),async {
        let mut socket=TcpStream::connect((std::net::Ipv4Addr::LOCALHOST,port)).await.map_err(|_|"Tor SOCKS proxy is unavailable. Check the port and start Tor.")?;
        socket.write_all(&[5,1,2]).await.map_err(|_|"Tor SOCKS connection failed.")?;
        let mut reply=[0;2];socket.read_exact(&mut reply).await.map_err(|_|"Tor SOCKS connection failed.")?;
        if reply!=[5,2] {return Err("The local proxy did not accept Tor SOCKS authentication.".into())}
        // Non-secret per-session credentials isolate circuits where Tor supports IsolateSOCKSAuth.
        let password=session.as_bytes();
        let mut auth=vec![1,6];auth.extend_from_slice(b"candid");auth.push(password.len() as u8);auth.extend_from_slice(password);
        socket.write_all(&auth).await.map_err(|_|"Tor SOCKS connection failed.")?;
        socket.read_exact(&mut reply).await.map_err(|_|"Tor SOCKS connection failed.")?;
        if reply!=[1,0] {return Err("Tor SOCKS authentication failed.".into())}
        // ATYP=domain: the onion address is resolved by Tor, never by the OS DNS resolver.
        let mut request=vec![5,1,0,3,address.len() as u8];request.extend_from_slice(address.as_bytes());request.extend_from_slice(&80u16.to_be_bytes());
        socket.write_all(&request).await.map_err(|_|"Tor SOCKS connection failed.")?;
        let mut header=[0;4];socket.read_exact(&mut header).await.map_err(|_|"Tor SOCKS connection failed.")?;
        if header[0]!=5 || header[1]!=0 || header[2]!=0 {return Err("The onion peer is unreachable. It may be publishing, offline, or blocked by the network. Check the invite and try again.".into())}
        let length=match header[3] {1=>4,4=>16,3=>socket.read_u8().await.map_err(|_|"Invalid SOCKS response.")? as usize,_=>return Err("Invalid SOCKS response.".into())};
        let mut bound=vec![0;length+2];socket.read_exact(&mut bound).await.map_err(|_|"Invalid SOCKS response.")?;
        Ok(socket)
    }).await.map_err(|_|"The onion connection timed out. Keep both apps and Tor runtimes online, then try again.".to_string())?
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn decodes_tor_cookie_paths() {
        assert_eq!(
            quoted(r#""C:\\Users\\Student\\Tor\\control_auth_cookie""#).unwrap(),
            r"C:\Users\Student\Tor\control_auth_cookie"
        );
        assert_eq!(
            quoted(r#""/tmp/hello\040world""#).unwrap(),
            "/tmp/hello world"
        );
        assert!(quoted("not quoted").is_err());
        assert!(unhex("bad").is_err());
    }
    #[tokio::test]
    async fn safecookie_authenticates_control_and_rejects_spoof() {
        for spoof in [false, true] {
            let cookie = [13u8; 32];
            let path = std::env::temp_dir()
                .join(format!("candid-cookie-test-{}", hex(&random32().unwrap())));
            std::fs::write(&path, cookie).unwrap();
            let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
            let port = listener.local_addr().unwrap().port();
            let quoted_path = serde_json::to_string(&path.to_string_lossy()).unwrap();
            let server = tokio::spawn(async move {
                use tokio::io::AsyncBufReadExt;
                let (stream, _) = listener.accept().await.unwrap();
                let mut peer = BufReader::new(stream);
                let mut line = String::new();
                peer.read_line(&mut line).await.unwrap();
                assert_eq!(line, "PROTOCOLINFO 1\r\n");
                peer.get_mut().write_all(format!("250-PROTOCOLINFO 1\r\n250-AUTH METHODS=COOKIE,SAFECOOKIE COOKIEFILE={quoted_path}\r\n250 OK\r\n").as_bytes()).await.unwrap();
                line.clear();
                peer.read_line(&mut line).await.unwrap();
                let nonce = unhex(
                    line.trim()
                        .strip_prefix("AUTHCHALLENGE SAFECOOKIE ")
                        .unwrap(),
                )
                .unwrap();
                let server_nonce = [9u8; 32];
                let value = [cookie.as_slice(), nonce.as_slice(), server_nonce.as_slice()].concat();
                let key = hmac::Key::new(
                    hmac::HMAC_SHA256,
                    b"Tor safe cookie authentication server-to-controller hash",
                );
                let proof = if spoof {
                    vec![0; 32]
                } else {
                    hmac::sign(&key, &value).as_ref().to_vec()
                };
                peer.get_mut()
                    .write_all(
                        format!(
                            "250 AUTHCHALLENGE SERVERHASH={} SERVERNONCE={}\r\n",
                            hex(&proof),
                            hex(&server_nonce)
                        )
                        .as_bytes(),
                    )
                    .await
                    .unwrap();
                line.clear();
                let bytes = peer.read_line(&mut line).await.unwrap();
                if spoof {
                    assert_eq!(
                        bytes, 0,
                        "must not disclose a client proof to a spoofed controller"
                    );
                    return;
                }
                let key = hmac::Key::new(
                    hmac::HMAC_SHA256,
                    b"Tor safe cookie authentication controller-to-server hash",
                );
                let proof = unhex(line.trim().strip_prefix("AUTHENTICATE ").unwrap()).unwrap();
                assert!(hmac::verify(&key, &value, &proof).is_ok());
                peer.get_mut().write_all(b"250 OK\r\n").await.unwrap();
                line.clear();
                peer.read_line(&mut line).await.unwrap();
                assert_eq!(line, "GETINFO status/bootstrap-phase\r\n");
                peer.get_mut().write_all(b"250-status/bootstrap-phase=NOTICE BOOTSTRAP PROGRESS=100 TAG=done\r\n250 OK\r\n").await.unwrap();
                // Dropping an authenticated controller does not send configuration changes.
                line.clear();
                assert_eq!(peer.read_line(&mut line).await.unwrap(), 0);
            });
            let result = Control::connect(port).await;
            assert_eq!(result.is_err(), spoof);
            drop(result);
            server.await.unwrap();
            std::fs::remove_file(path).unwrap();
        }
    }
}
