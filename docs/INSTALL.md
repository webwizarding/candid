# Installing Candid 0.1.4

Choose one download from [the latest release](https://github.com/webwizarding/candid/releases/latest):

- **Windows** — `Candid-Windows-Setup.exe`. It requires Microsoft Edge WebView2. The current 0.1.4 installer is unsigned; Smart App Control can block it completely. A signed replacement is pending publisher verification. See [signing status and setup](WINDOWS_SIGNING.md).
- **macOS · Apple Silicon** — `Candid-macOS-Apple-Silicon.dmg`. Open it and drag Candid into Applications. Requires macOS 12 or later on an Apple Silicon Mac. This build is ad-hoc signed for integrity, not Developer-ID signed or notarized. An Intel build is not included.

Download only from the Candid repository. A local rebuild or different installer format does not provide a trusted publisher signature. Windows installers are built in GitHub Actions; physical Windows runtime testing is still outstanding.

Quit the older running app before updating. Updates preserve your existing app data. Export an encrypted backup before updating or moving devices.

## Start fresh

Open **Settings → Privacy → Fresh start**. Use **Back up first** if you want a recovery copy. Choose **Reset Candid**, review the summary, type `RESET`, then choose **Erase everything & restart**.

Reset permanently clears Candid data and preferences in this installation, including notes and trash, club identity, scheduling, and focus history. There is no Undo. It does not delete exported files or other people's club copies, cancel bookings for guests, or uninstall your separately installed Tor runtime. Your other browser profiles/devices have separate data.

See [scheduling and notes](ACADEMIC_WORKSPACES.md), [Tor setup](TOR_SETUP.md), and [verification limits](../VERIFICATION.md) for more help. These guides and source code stay in the repository; installer downloads have only the two platform choices.
