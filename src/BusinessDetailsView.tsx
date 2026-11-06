import { useState } from "react";
import { Check, Image, CalendarDays } from "lucide-react";
import type { Business } from "./domain";
import { FEATURE_LABELS, REVIEW_LABELS, argentinaDate } from "./catalogModel";
import { photoSource } from "./api/client";
export default function BusinessDetailsView({
  business,
}: {
  business: Business;
}) {
  const [active, setActive] = useState(0);
  const [failed, setFailed] = useState<string[]>([]);
  const details = business.details;
  if (!details) return null;
  const photos = (details.photos || []).filter(
    (p) => !failed.includes(photoSource(p)),
  );
  const selected = photos[Math.min(active, Math.max(photos.length - 1, 0))];
  const today = argentinaDate();
  const special = (details.exceptions || [])
    .filter((e) => e.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 6);
  return (
    <>
      {photos.length > 0 && (
        <section className="detail-gallery" aria-label="Galería del comercio">
          <div className="gallery-main">
            <img
              src={photoSource(selected)}
              alt={selected.alt}
              referrerPolicy="no-referrer"
              onError={() => setFailed((p) => [...p, photoSource(selected)])}
            />
            <span>
              <Image size={14} />
              {Math.min(active, photos.length - 1) + 1} / {photos.length}
            </span>
          </div>
          {photos.length > 1 && (
            <div className="gallery-thumbs">
              {photos.map((p, i) => (
                <button
                  key={photoSource(p)}
                  aria-label={`Ver foto ${i + 1}: ${p.alt}`}
                  aria-pressed={active === i}
                  onClick={() => setActive(i)}
                >
                  <img
                    src={photoSource(p)}
                    alt=""
                    referrerPolicy="no-referrer"
                  />
                </button>
              ))}
            </div>
          )}
        </section>
      )}
      {details.features?.length ? (
        <div className="detail-features" aria-label="Servicios declarados">
          {details.features.map((f) => (
            <span key={f}>{FEATURE_LABELS[f]}</span>
          ))}
        </div>
      ) : null}
      {details.review && (
        <section className="reviewed-data">
          <Check size={17} />
          <div>
            <strong>
              Datos revisados el{" "}
              {new Date(`${details.review.date}T12:00:00Z`).toLocaleDateString(
                "es-AR",
              )}
            </strong>
            <p>
              {details.review.fields.map((f) => REVIEW_LABELS[f]).join(" · ")}
            </p>
            <small>
              Confirmación registrada por el responsable del catálogo. No
              califica la calidad del servicio.
            </small>
          </div>
        </section>
      )}
      {details.services?.length ? (
        <section className="business-services">
          <h3>Servicios y productos</h3>
          {details.services.map((s) => (
            <div key={s.name}>
              <div>
                <strong>{s.name}</strong>
                {s.description && <p>{s.description}</p>}
                {s.priceNote && <small>{s.priceNote}</small>}
              </div>
              <span>
                {s.price === undefined
                  ? "Consultar precio"
                  : new Intl.NumberFormat("es-AR", {
                      style: "currency",
                      currency: "ARS",
                      maximumFractionDigits: 2,
                    }).format(s.price)}
                {s.unit && <small> / {s.unit}</small>}
              </span>
            </div>
          ))}
          <p className="muted">
            Precios informados por el comercio. Confirmá condiciones y
            disponibilidad antes de contratar.
          </p>
        </section>
      ) : null}
      {special.length > 0 && (
        <section className="special-hours">
          <h3>
            <CalendarDays size={18} />
            Horarios especiales
          </h3>
          {special.map((e) => (
            <div key={e.date}>
              <strong>
                {new Date(`${e.date}T12:00:00Z`).toLocaleDateString("es-AR")}
              </strong>
              <span>
                {e.closed
                  ? "Cerrado"
                  : e.periods
                      .map(
                        (p) =>
                          `${p.opens} a ${p.closes}${p.closes < p.opens ? " (día siguiente)" : ""}`,
                      )
                      .join(" / ")}
              </span>
              {e.note && <small>{e.note}</small>}
            </div>
          ))}
        </section>
      )}
    </>
  );
}
