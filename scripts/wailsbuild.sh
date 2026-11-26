#!/usr/bin/env bash
# `wails build` for the commands of packaging.toml, run by PackagingOnLinux (locally or in the
# release, in .github/build.Dockerfile). Usage: scripts/wailsbuild.sh [wails build flags...]
#   [linux]   scripts/wailsbuild.sh -tags webkit2_41
#   [windows] scripts/wailsbuild.sh -platform windows/amd64
#
# The exe's file version (wails.json info.productVersion, digits only, Properties > Details)
# is $APP_VERSION, set by PackagingOnLinux (1.2.0~beta -> 1.2.0). wails.json is restored
# afterwards.
set -euo pipefail

cd "$(dirname "$0")/.."

if [ -n "${APP_VERSION:-}" ]; then
  backup="$(mktemp)"
  cp wails.json "$backup"
  trap 'cp "$backup" wails.json && rm -f "$backup"' EXIT
  node -e '
    const fs = require("fs");
    const config = JSON.parse(fs.readFileSync("wails.json", "utf8"));
    config.info = { ...config.info, productVersion: process.argv[1] };
    fs.writeFileSync("wails.json", JSON.stringify(config, null, 2) + "\n");
  ' "${APP_VERSION%%[~+]*}"
fi

echo "wails build $*"
wails build "$@"
