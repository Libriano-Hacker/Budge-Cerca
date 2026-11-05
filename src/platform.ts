import { Capacitor } from "@capacitor/core";
import type { Coordinates } from "./domain";
export const USER_APP =
  import.meta.env.VITE_APP_TARGET === "mobile" || Capacitor.isNativePlatform();
export const NATIVE_APP = Capacitor.isNativePlatform();

export async function currentPosition(): Promise<Coordinates> {
  if (NATIVE_APP) {
    const { Geolocation } = await import("@capacitor/geolocation");
    const p = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 60000,
    });
    return { lat: p.coords.latitude, lng: p.coords.longitude };
  }
  if (!navigator.geolocation)
    throw new Error(
      "Este navegador no permite usar GPS. Podés buscar por nombre, rubro o dirección.",
    );
  return new Promise((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      reject,
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    ),
  );
}

export function locationError(error: unknown) {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? error.code
      : undefined;
  if (code === 1 || code === "OS-PLUG-GLOC-0003")
    return "No se autorizó el GPS. Habilitalo en los permisos del dispositivo o seguí buscando por dirección.";
  if (error instanceof Error && error.message.includes("no permite usar GPS"))
    return error.message;
  return "No pudimos obtener tu ubicación. Revisá el GPS y volvé a intentar.";
}
