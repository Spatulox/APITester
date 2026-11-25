# Changelog

Pushing a tag `vX.Y.Z_beta`, `vX.Y.Z_rc` or `vX.Y.Z` (see `.github/workflows/release.yml`)
publishes a GitHub release whose notes are the matching `## vX.Y.Z...` section below.

## v1.2.0_beta

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
