# Installing Candid 0.1.0

Download release files only from https://github.com/webwizarding/candid/releases and compare the SHA-256 hashes with the release checksum files.

## macOS — Apple Silicon

Use the `macos-arm64.dmg` disk image, or unzip `macos-arm64.zip`. Move Candid.app into Applications. This build supports Apple Silicon Macs; it is not an Intel or universal build.

Candid is ad-hoc signed for bundle integrity, not signed with an Apple Developer ID or notarized. macOS may block downloaded preview builds. If your device or organization will not permit the preview, build the source locally using the README instructions. Release checksums verify file integrity; they are not a publisher certificate.

Quit an older running copy before opening an updated build. App data stays local to the same app identifier. Keep an encrypted planner backup before updates.

## Windows — x64

When the Windows build succeeds, the release includes an EXE setup installer and an MSI package. Use one installer, not both. The app requires Microsoft Edge WebView2. These preview installers are not Authenticode-signed, and Windows may show a reputation warning. A successful CI build does not replace testing on your own Windows configuration.

## Source

The release includes a source archive and GitHub's automatic source downloads. The source uses Node.js and Rust. Follow README.md for local development/builds, and see VERIFICATION.md for known limits.

Canvas feed fetching is desktop-only and happens on demand. Local web storage is not encrypted at rest; password-protected exported backups are encrypted. Live club peer sync remains experimental; club file handoff is the tested fallback.
