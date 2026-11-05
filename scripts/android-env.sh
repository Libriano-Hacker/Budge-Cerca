#!/usr/bin/env bash
# Herramientas locales; no contiene credenciales.
TBC_REPO_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
export TBC_TOOLS_ROOT="${TBC_TOOLS_ROOT:-$(dirname -- "$TBC_REPO_ROOT")/.mobile-tools}"
export JAVA_HOME="${TBC_JAVA_HOME:-${JAVA_HOME:-$TBC_TOOLS_ROOT/jdk-21}}"
export ANDROID_HOME="${TBC_ANDROID_HOME:-${ANDROID_HOME:-$TBC_TOOLS_ROOT/android-sdk}}"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export ANDROID_USER_HOME="${ANDROID_USER_HOME:-$TBC_TOOLS_ROOT/android-user}"
export GRADLE_USER_HOME="${GRADLE_USER_HOME:-$TBC_TOOLS_ROOT/gradle}"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"
if [[ -f "$TBC_TOOLS_ROOT/java-cacerts" && "${JAVA_TOOL_OPTIONS:-}" != *javax.net.ssl.trustStore=* ]]; then
  export JAVA_TOOL_OPTIONS="${JAVA_TOOL_OPTIONS:-} -Djavax.net.ssl.trustStore=$TBC_TOOLS_ROOT/java-cacerts -Djavax.net.ssl.trustStorePassword=changeit"
fi
