#!/usr/bin/env bash
# Verify Info.plist inside an iOS .ipa before App Store submit.
# Usage: ./scripts/verify-ios-ipa-metadata.sh path/to/build.ipa

set -euo pipefail

IPA="${1:-}"
if [[ -z "$IPA" || ! -f "$IPA" ]]; then
  echo "Usage: $0 path/to/build.ipa"
  exit 1
fi

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

unzip -q "$IPA" -d "$TMP_DIR"
PLIST="$(find "$TMP_DIR/Payload" -name Info.plist -maxdepth 3 | head -1)"

if [[ -z "$PLIST" ]]; then
  echo "ERROR: Info.plist not found in IPA"
  exit 1
fi

echo "=== Info.plist from submitted IPA ==="
plutil -p "$PLIST" | grep -E "UIRequiredDeviceCapabilities|UIDeviceFamily|UIBackgroundModes|CFBundleShortVersionString|CFBundleVersion" || true

CAPS="$(plutil -extract UIRequiredDeviceCapabilities json -o - "$PLIST" 2>/dev/null || echo "missing")"
echo ""
echo "UIRequiredDeviceCapabilities: $CAPS"

if [[ "$CAPS" != "[]" && "$CAPS" != "missing" ]]; then
  echo "WARNING: Non-empty UIRequiredDeviceCapabilities may block iPad install."
  exit 2
fi

echo "OK: No restrictive device capabilities detected."
