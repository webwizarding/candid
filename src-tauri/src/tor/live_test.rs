//! Explicit real-network check with two independent local Tor runtimes.
use super::*;
#[tokio::test]
#[ignore = "requires explicitly started Tor clients on ports 19050/19051 and 19060/19061"]
async fn two_live_tor_runtimes_exchange_a_club() {
    let mut controller = control::Control::connect(19051)
        .await
        .expect("host Tor must be bootstrapped");
    let _guest_controller = control::Control::connect(19061)
        .await
        .expect("guest Tor must be bootstrapped");
    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let onion = controller
        .service(listener.local_addr().unwrap().port())
        .await
        .expect("create ephemeral service");
    let key = control::random32().unwrap();
    let host = tokio::spawn(async move {
        let (stream, _) = listener.accept().await.unwrap();
        transport::handshake(stream, &key, "synthetic-club", false)
            .await
            .expect("host authenticated handshake")
    });
    let mut stream = None;
    for _ in 0..3 {
        match control::socks(19060, &onion, "synthetic-guest-session").await {
            Ok(s) => {
                stream = Some(s);
                break;
            }
            Err(_) => tokio::time::sleep(Duration::from_secs(5)).await,
        }
    }
    let guest = transport::handshake(
        stream.expect("onion service reachable through guest runtime"),
        &key,
        "synthetic-club",
        true,
    )
    .await
    .expect("guest authenticated handshake");
    let host = host.await.unwrap();
    let packet=serde_json::json!({"format":"calender-club","version":1,"club":{"id":"synthetic-club","name":"Synthetic Tor test","records":[]}}).to_string();
    let (_h_tx, h_rx) = watch::channel(Some(packet.clone()));
    let (_g_tx, g_rx) = watch::channel(Some(packet.clone()));
    let (done, mut received) = tokio::sync::mpsc::unbounded_channel();
    let host_done = done.clone();
    let h = tokio::spawn(async move {
        transport::exchange(host.0, host.1, h_rx, "synthetic-club", move |p| {
            let _ = host_done.send(p);
        })
        .await
    });
    let g = tokio::spawn(async move {
        transport::exchange(guest.0, guest.1, g_rx, "synthetic-club", move |p| {
            let _ = done.send(p);
        })
        .await
    });
    for _ in 0..2 {
        assert_eq!(
            tokio::time::timeout(Duration::from_secs(90), received.recv())
                .await
                .unwrap()
                .unwrap(),
            packet
        )
    }
    h.abort();
    g.abort();
    drop(controller); // closes the ephemeral onion service
}

#[tokio::test]
#[ignore = "requires explicit live Tor runtimes"]
async fn full_host_flow_publishes_single_use_invite_and_syncs() {
    let packet=serde_json::json!({"format":"calender-club","version":1,"club":{"id":"synthetic-club","name":"Synthetic host test","records":[]}}).to_string();
    let (_host_send, host_recv) = watch::channel(Some(packet.clone()));
    let (events, mut receiver) = tokio::sync::mpsc::unbounded_channel();
    let host_packet = packet.clone();
    let host = tokio::spawn(async move {
        host_session(
            "synthetic-host-session".into(),
            host_packet,
            19051,
            19050,
            host_recv,
            move |state, _, data| {
                let _ = events.send((state.to_string(), data));
            },
        )
        .await
    });
    let code = tokio::time::timeout(Duration::from_secs(240), async {
        loop {
            let (state, data) = receiver.recv().await.expect("host progress");
            if state == "invite" {
                break data.unwrap();
            }
        }
    })
    .await
    .expect("host must publish invite");
    let (invite, key) = read_invite(&code).unwrap();
    let stream = control::socks(19060, &invite.onion, "synthetic-guest-session")
        .await
        .expect("guest reaches host");
    let guest = transport::handshake(stream, &key, &invite.club_id, true)
        .await
        .unwrap();
    let (_guest_send, guest_recv) = watch::channel(Some(packet.clone()));
    let (done, mut received) = tokio::sync::mpsc::unbounded_channel();
    let guest = tokio::spawn(async move {
        transport::exchange(guest.0, guest.1, guest_recv, "synthetic-club", move |p| {
            let _ = done.send(p);
        })
        .await
    });
    let host_received = tokio::time::timeout(Duration::from_secs(90), async {
        loop {
            let (state, data) = receiver.recv().await.unwrap();
            if state == "packet" {
                break data.unwrap();
            }
        }
    })
    .await
    .unwrap();
    assert_eq!(host_received, packet);
    assert_eq!(
        tokio::time::timeout(Duration::from_secs(90), received.recv())
            .await
            .unwrap()
            .unwrap(),
        packet
    );
    // The active session has closed its listener; the same invite cannot admit a second guest.
    assert!(
        control::socks(19060, &invite.onion, "synthetic-second-guest")
            .await
            .is_err()
    );
    host.abort();
    guest.abort();
}
