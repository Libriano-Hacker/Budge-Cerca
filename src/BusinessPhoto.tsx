import { useState } from "react";
import type { CSSProperties } from "react";
import type { Business } from "./domain";
import { validPhotoUrl } from "./domain";

const tiles: Record<string, number> = {
  Panaderías: 0,
  Gastronomía: 1,
  Moda: 2,
  "Almacenes y kioscos": 3,
  Supermercados: 3,
  Fiambrerías: 3,
  Belleza: 4,
  Ferreterías: 5,
  Automotor: 7,
  Servicios: 8,
};

export default function BusinessPhoto({
  business,
  priority = false,
}: {
  business: Pick<Business, "id" | "name" | "category" | "imageUrl">;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState("");
  const tile =
    business.id === "el-encuentro" ? 6 : (tiles[business.category] ?? 3);
  const url =
    business.imageUrl &&
    validPhotoUrl(business.imageUrl) &&
    failed !== business.imageUrl
      ? business.imageUrl
      : null;
  return (
    <span
      className="business-photo"
      role="img"
      aria-label={
        url
          ? `Foto de ${business.name}`
          : `Imagen ilustrativa de ${business.category}`
      }
      style={
        {
          "--photo-x": `${[0, 50, 100][tile % 3]}%`,
          "--photo-y": `${[0, 47, 100][Math.floor(tile / 3)]}%`,
        } as CSSProperties
      }
    >
      {url && (
        <img
          src={url}
          alt=""
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(url)}
        />
      )}
    </span>
  );
}
