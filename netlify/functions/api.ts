import type { Context, Config } from "@netlify/functions";
import { createApi } from "../../server/handler";
import { serverConfiguration, supabaseServices } from "../../server/supabase";
let handler: ReturnType<typeof createApi> | undefined;
export default async (request: Request, context: Context) => {
  if (!handler) {
    try {
      const config = serverConfiguration();
      handler = createApi(
        config
          ? { ...config, ...supabaseServices(config), mode: "live" }
          : null,
      );
    } catch {
      return new Response(
        JSON.stringify({
          code: "CONFIGURATION_ERROR",
          message:
            "El administrador debe revisar la configuración del servicio.",
        }),
        {
          status: 503,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-store",
          },
        },
      );
    }
  }
  return handler(request, { ip: context.ip });
};
export const config: Config = { path: "/api/*" };
