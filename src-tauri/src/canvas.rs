use std::time::Duration;

fn canvas_url(raw: &str) -> Result<reqwest::Url, String> {
    let url =
        reqwest::Url::parse(raw).map_err(|_| "Paste a valid HTTPS Canvas feed URL.".to_string())?;
    let host = url.host_str().unwrap_or("");
    let supported_host = host.ends_with(".instructure.com") || host == "canvas.ucsc.edu";
    if url.scheme() != "https"
        || !supported_host
        || !url.username().is_empty()
        || url.password().is_some()
        || url.port().is_some()
        || !url.path().starts_with("/feeds/calendars/")
        || !url.path().ends_with(".ics")
    {
        return Err("Direct import accepts HTTPS calendar feeds on *.instructure.com or canvas.ucsc.edu. For other university Canvas domains, download the .ics file and import that instead.".into());
    }
    Ok(url)
}

/// The private feed URL is held for this request only. No credentials, feed URLs,
/// cookies or response data are written to disk or logged by this command.
#[tauri::command]
pub async fn fetch_canvas_feed(url: String) -> Result<String, String> {
    let target = canvas_url(&url)?;
    let client = reqwest::Client::builder()
        .redirect(reqwest::redirect::Policy::none())
        .timeout(Duration::from_secs(25))
        .build()
        .map_err(|_| "Could not initialize the secure feed reader.".to_string())?;
    let mut response = client.get(target).send().await.map_err(|_| {
        "Canvas could not be reached. Check your connection and feed link.".to_string()
    })?;
    if !response.status().is_success() {
        return Err(
            "Canvas did not return a calendar. Refresh the feed link in Canvas and try again."
                .into(),
        );
    }
    let mut bytes = Vec::new();
    while let Some(chunk) = response
        .chunk()
        .await
        .map_err(|_| "Canvas download was interrupted.".to_string())?
    {
        if bytes.len() + chunk.len() > 2_000_000 {
            return Err(
                "Canvas feed exceeds the 2 MB import limit. Download a smaller calendar file."
                    .into(),
            );
        }
        bytes.extend_from_slice(&chunk);
    }
    let text = String::from_utf8(bytes)
        .map_err(|_| "Canvas returned an unsupported file encoding.".to_string())?;
    if !text
        .trim_start_matches('\u{feff}')
        .trim_start()
        .starts_with("BEGIN:VCALENDAR")
    {
        return Err("The link did not return an iCalendar feed.".into());
    }
    Ok(text)
}

#[cfg(test)]
mod tests {
    use super::canvas_url;
    #[test]
    fn allows_supported_canvas_feeds() {
        assert!(canvas_url("https://campus.instructure.com/feeds/calendars/user_test.ics").is_ok());
        assert!(canvas_url("https://canvas.ucsc.edu/feeds/calendars/user_test.ics").is_ok());
        for bad in [
            "http://campus.instructure.com/feeds/calendars/test.ics",
            "https://instructure.com.evil.test/feeds/calendars/test.ics",
            "https://127.0.0.1/feeds/calendars/test.ics",
            "https://campus.instructure.com/courses/test",
            "https://user:pass@campus.instructure.com/feeds/calendars/test.ics",
        ] {
            assert!(canvas_url(bad).is_err());
        }
    }

    #[test]
    fn rejects_ucsc_lookalikes_and_invalid_feed_urls() {
        for bad in [
            "https://canvas.ucsc.edu.evil.test/feeds/calendars/user_test.ics",
            "https://evilcanvas.ucsc.edu/feeds/calendars/user_test.ics",
            "https://canvas.ucsc.edu@evil.test/feeds/calendars/user_test.ics",
            "http://canvas.ucsc.edu/feeds/calendars/user_test.ics",
            "https://canvas.ucsc.edu:8443/feeds/calendars/user_test.ics",
            "https://user:pass@canvas.ucsc.edu/feeds/calendars/user_test.ics",
            "https://canvas.ucsc.edu/courses/user_test.ics",
        ] {
            assert!(canvas_url(bad).is_err());
        }
    }
}
