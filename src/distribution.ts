import settings from "../app.config.json";
type DistributionConfig = {
  googlePlayUrl: string | null;
  appStoreUrl: string | null;
  androidApkUrl: string | null;
};
export const PUBLIC_APP_URL = settings.publicUrl.replace(/\/$/, "");
export const DOWNLOAD_URL = `${PUBLIC_APP_URL}/descargar`;
const links = settings.distribution as DistributionConfig;
export function safeDownloadLink(
  value: string | null,
  kind: "google" | "apple" | "apk",
) {
  if (!value) return null;
  try {
    const u = new URL(value);
    if (u.protocol !== "https:" || u.username || u.password) return null;
    if (kind === "google" && u.hostname !== "play.google.com") return null;
    if (kind === "apple" && u.hostname !== "apps.apple.com") return null;
    if (kind === "apk" && !u.pathname.endsWith(".apk")) return null;
    return u.href;
  } catch {
    return null;
  }
}
export const downloads = {
  google: safeDownloadLink(links.googlePlayUrl, "google"),
  apple: safeDownloadLink(links.appStoreUrl, "apple"),
  apk: safeDownloadLink(links.androidApkUrl, "apk"),
};
