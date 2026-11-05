#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.."
source scripts/android-env.sh
if [[ ! -x "$JAVA_HOME/bin/javac" || ! -d "$ANDROID_HOME/platforms/android-36" ]]; then
  echo "Faltan JDK 21 o Android SDK 36. Ejecutá npm run setup:android o configurá JAVA_HOME y ANDROID_HOME." >&2
  exit 1
fi
npm run build:mobile
npx cap sync android
mkdir -p artifacts/android
(
  cd android
  ./gradlew :app:assembleDebug --no-daemon --max-workers=2
)
cp android/app/build/outputs/apk/debug/app-debug.apk artifacts/android/tu-barrio-cerca-debug.apk
"$ANDROID_HOME/build-tools/36.0.0/apksigner" verify --verbose artifacts/android/tu-barrio-cerca-debug.apk
sha256sum artifacts/android/tu-barrio-cerca-debug.apk > artifacts/android/tu-barrio-cerca-debug.apk.sha256
echo "APK de pruebas generado y firma debug verificada. No es una publicación en Google Play."
