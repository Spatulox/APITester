# Changelog

Pushing a tag `vX.Y.Z_beta`, `vX.Y.Z_rc` or `vX.Y.Z` (see `.github/workflows/release.yml`)
publishes a GitHub release whose notes are the matching `## vX.Y.Z...` section below.

## [v1.2.1_beta] - 2026-11-26

### Fixes
- The HTTP status is now always checked, even when the response has no body. Before,
  a test with no `expectedOutput` passed whatever the status (e.g. `204` received where
  `403` was expected).
- `_@empty` / `_@nothing` work: a response with no body matches them (and `{}`), and a
  response with a body is an error (`ErrorUnexpectedResponse`). The editor no longer
  turns the marker into `{}` when saving.
- Automatic filling of the expected output stores an object response as an object, not
  as a one-item array that failed on the next run. Configs already filled this way still
  fail: remove the square brackets, or run the "update the expected outputs" action again.
- Filling a test whose response has no body writes `_@empty`.
- The results show the raw body of a non-JSON response with an unexpected HTTP status
  (e.g. an HTML error page).

### Which file to download
- Ubuntu / Debian: `apitester_<version>+ubuntu<release>_<arch>.deb` for your Ubuntu
  release (`sudo apt install ./apitester_*.deb` also installs WebKitGTK).
- Fedora / RHEL / openSUSE: the `.rpm` for your architecture.
- Other Linux: the `.tar.gz` (needs WebKitGTK 4.1 installed).
- Windows: `APITester-<version>-windows-x64-setup.exe` (installer) or the portable
  `.zip`. The WebView2 runtime is offered for download on first launch if it is missing.

## [v1.2.0_beta] - 2026-11-25

### New
- Config explorer: configs are grouped in folders, with rename in place, a context menu
  and drag and drop to move a config to another group. The editor and the results now
  live in tabs of a workspace.
- Named authentication profiles (one per role), chosen per test: `noauth`, `bearer`,
  `apikey` (header / query / cookie), `basicAuth`, `oauth2` (client credentials) and
  `login` (call a login endpoint and reuse its token), with extra headers.
- The authentication of Postman and Insomnia exports is imported too.
- Linux packages (.deb per Ubuntu release, .rpm, .tar.gz) and Windows installer and
  portable zip, built by PackagingOnLinux and published on each release.

### Fixes
- Unknown HTTP methods are reported instead of being sent.
- A config file is only rewritten when a run changed it.
- Config paths can no longer escape the config folder.
- Running the "Sans groupe" (root) group works.
- Removing a warning now works, and the endpoint "already asked" flag is saved.
- The CSS now loads in the desktop window under `wails dev`.

### Other
- Wails updated to v2.10.2.

### Which file to download
- Ubuntu / Debian: `apitester_<version>+ubuntu<release>_<arch>.deb` for your Ubuntu
  release (`sudo apt install ./apitester_*.deb` also installs WebKitGTK).
- Fedora / RHEL / openSUSE: the `.rpm` for your architecture.
- Other Linux: the `.tar.gz` (needs WebKitGTK 4.1 installed).
- Windows: `APITester-<version>-windows-x64-setup.exe` (installer) or the portable
  `.zip`. The WebView2 runtime is offered for download on first launch if it is missing.
