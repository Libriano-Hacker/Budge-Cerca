import { useState } from "react";
import type {
  BusinessDetails,
  PhotoItem,
  ServiceItem,
  SpecialHours,
  ReviewField,
  FeatureKey,
} from "./catalogModel";
import { FEATURE_LABELS, REVIEW_LABELS, argentinaDate } from "./catalogModel";
import { photoSource } from "./api/client";
export default function BusinessDetailsEditor({
  value,
  onChange,
  upload,
  onBusyChange,
}: {
  onBusyChange?: (busy: boolean) => void;
  value: BusinessDetails;
  onChange: (value: BusinessDetails) => void;
  upload?: (file: File) => Promise<PhotoItem>;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const update = (key: keyof BusinessDetails, next: unknown) =>
    onChange({ ...value, [key]: next });
  const services = value.services || [],
    photos = value.photos || [],
    exceptions = value.exceptions || [];
  function service(i: number, change: Partial<ServiceItem>) {
    update(
      "services",
      services.map((s, n) => (n === i ? { ...s, ...change } : s)),
    );
  }
  function exception(i: number, change: Partial<SpecialHours>) {
    update(
      "exceptions",
      exceptions.map((s, n) => (n === i ? { ...s, ...change } : s)),
    );
  }
  return (
    <section className="details-editor">
      <h3>Ficha ampliada</h3>
      <p>
        Marcá solo prestaciones confirmadas por el comercio. Las fotos deben ser
        propias o tener autorización.
      </p>
      <fieldset>
        <legend>Prestaciones y medios de pago</legend>
        <div className="feature-options">
          {Object.entries(FEATURE_LABELS).map(([key, label]) => (
            <label key={key}>
              <input
                type="checkbox"
                checked={value.features?.includes(key as FeatureKey) || false}
                onChange={(e) =>
                  update(
                    "features",
                    e.target.checked
                      ? [...(value.features || []), key]
                      : (value.features || []).filter((f) => f !== key),
                  )
                }
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend>Servicios, productos y precios</legend>
        {services.map((s, i) => (
          <div className="editor-block" key={i}>
            <div className="form-grid">
              <label>
                Servicio o producto
                <input
                  required
                  maxLength={80}
                  value={s.name}
                  onChange={(e) => service(i, { name: e.target.value })}
                />
              </label>
              <label>
                Precio en ARS (opcional)
                <input
                  type="number"
                  min="0"
                  max="1000000000"
                  step="0.01"
                  value={s.price ?? ""}
                  onChange={(e) => {
                    const next = { ...s };
                    if (e.target.value === "") delete next.price;
                    else next.price = Number(e.target.value);
                    update(
                      "services",
                      services.map((v, n) => (n === i ? next : v)),
                    );
                  }}
                />
              </label>
              <label>
                Descripción
                <input
                  maxLength={180}
                  value={s.description || ""}
                  onChange={(e) => service(i, { description: e.target.value })}
                />
              </label>
              <label>
                Unidad
                <input
                  maxLength={35}
                  placeholder="por persona, por kg…"
                  value={s.unit || ""}
                  onChange={(e) => service(i, { unit: e.target.value })}
                />
              </label>
              <label className="full-width">
                Condiciones del precio
                <input
                  maxLength={180}
                  value={s.priceNote || ""}
                  onChange={(e) => service(i, { priceNote: e.target.value })}
                />
              </label>
            </div>
            <button
              type="button"
              className="text-action"
              onClick={() =>
                update(
                  "services",
                  services.filter((_, n) => n !== i),
                )
              }
            >
              Quitar servicio
            </button>
          </div>
        ))}
        <button
          type="button"
          className="button button-secondary"
          disabled={services.length >= 24}
          onClick={() => update("services", [...services, { name: "" }])}
        >
          Agregar servicio
        </button>
      </fieldset>
      <fieldset>
        <legend>Galería · hasta 8 fotos</legend>
        {photos.map((p, i) => (
          <div className="editor-block photo-editor" key={i}>
            {photoSource(p) && (
              <img
                src={photoSource(p)}
                alt="Vista previa"
                referrerPolicy="no-referrer"
              />
            )}
            <div>
              {!p.assetId && (
                <label>
                  Enlace HTTPS de la foto
                  <input
                    required
                    type="url"
                    maxLength={2048}
                    value={p.url || ""}
                    onChange={(e) =>
                      update(
                        "photos",
                        photos.map((v, n) =>
                          n === i ? { ...v, url: e.target.value } : v,
                        ),
                      )
                    }
                  />
                </label>
              )}
              <label>
                Descripción de la foto
                <input
                  required
                  maxLength={120}
                  value={p.alt}
                  onChange={(e) =>
                    update(
                      "photos",
                      photos.map((v, n) =>
                        n === i ? { ...v, alt: e.target.value } : v,
                      ),
                    )
                  }
                />
              </label>
              <button
                type="button"
                className="text-action"
                onClick={() =>
                  update(
                    "photos",
                    photos.filter((_, n) => n !== i),
                  )
                }
              >
                Quitar foto
              </button>
            </div>
          </div>
        ))}
        <div className="inline-actions">
          <button
            type="button"
            className="button button-secondary"
            disabled={photos.length >= 8 || busy}
            onClick={() => update("photos", [...photos, { url: "", alt: "" }])}
          >
            Agregar enlace de foto
          </button>
          {upload && (
            <label className="button button-secondary">
              {busy ? "Procesando foto…" : "Subir foto autorizada"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={busy || photos.length >= 8}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setError("");
                  if (file.size > 5 * 1024 * 1024) {
                    setError("La foto debe pesar como máximo 5 MB.");
                    return;
                  }
                  setBusy(true);
                  onBusyChange?.(true);
                  try {
                    const photo = await upload(file);
                    update("photos", [...photos, photo]);
                  } catch (err) {
                    setError(
                      err instanceof Error
                        ? err.message
                        : "No se pudo subir la foto.",
                    );
                  } finally {
                    setBusy(false);
                    onBusyChange?.(false);
                    e.target.value = "";
                  }
                }}
              />
            </label>
          )}
        </div>
        <small>
          JPEG, PNG o WebP. Las subidas se procesan sin metadatos y permanecen
          privadas hasta publicar la ficha.
        </small>
      </fieldset>
      <fieldset>
        <legend>Feriados, vacaciones y horarios especiales</legend>
        <p>
          Estas fechas reemplazan el horario semanal. No agregamos horarios de
          feriados automáticamente.
        </p>
        {exceptions.map((x, i) => (
          <div className="editor-block" key={i}>
            <div className="form-grid">
              <label>
                Fecha especial
                <input
                  required
                  type="date"
                  min="2000-01-01"
                  max="2100-12-31"
                  value={x.date}
                  onChange={(e) => exception(i, { date: e.target.value })}
                />
              </label>
              <label>
                Motivo (opcional)
                <input
                  maxLength={160}
                  value={x.note || ""}
                  onChange={(e) => exception(i, { note: e.target.value })}
                />
              </label>
            </div>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={x.closed}
                onChange={(e) =>
                  exception(i, {
                    closed: e.target.checked,
                    periods: e.target.checked
                      ? []
                      : [{ opens: "09:00", closes: "18:00" }],
                  })
                }
              />
              Cerrado todo el día
            </label>
            {!x.closed &&
              x.periods.map((p, n) => (
                <div className="inline-actions" key={n}>
                  <label>
                    Desde
                    <input
                      required
                      type="time"
                      value={p.opens}
                      onChange={(e) =>
                        exception(i, {
                          periods: x.periods.map((v, j) =>
                            j === n ? { ...v, opens: e.target.value } : v,
                          ),
                        })
                      }
                    />
                  </label>
                  <label>
                    Hasta
                    <input
                      required
                      type="time"
                      value={p.closes}
                      onChange={(e) =>
                        exception(i, {
                          periods: x.periods.map((v, j) =>
                            j === n ? { ...v, closes: e.target.value } : v,
                          ),
                        })
                      }
                    />
                  </label>
                  {x.periods.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        exception(i, {
                          periods: x.periods.filter((_, j) => j !== n),
                        })
                      }
                    >
                      Quitar franja
                    </button>
                  )}
                </div>
              ))}
            {!x.closed && x.periods.length < 4 && (
              <button
                type="button"
                className="text-action"
                onClick={() =>
                  exception(i, {
                    periods: [
                      ...x.periods,
                      { opens: "19:00", closes: "22:00" },
                    ],
                  })
                }
              >
                Agregar franja
              </button>
            )}
            <button
              type="button"
              className="text-action"
              onClick={() =>
                update(
                  "exceptions",
                  exceptions.filter((_, n) => n !== i),
                )
              }
            >
              Quitar fecha
            </button>
          </div>
        ))}
        <button
          type="button"
          className="button button-secondary"
          disabled={exceptions.length >= 64}
          onClick={() =>
            update("exceptions", [
              ...exceptions,
              { date: "", closed: true, periods: [] },
            ])
          }
        >
          Agregar fecha especial
        </button>
      </fieldset>
      <fieldset>
        <legend>Revisión de datos</legend>
        <p>
          Confirmá únicamente los datos que verificaste con el responsable del
          comercio.
        </p>
        <label>
          Fecha de revisión
          <input
            type="date"
            min="2000-01-01"
            max={argentinaDate()}
            value={value.review?.date || ""}
            onChange={(e) => {
              if (!e.target.value) {
                const next = { ...value };
                delete next.review;
                onChange(next);
              } else
                update("review", {
                  date: e.target.value,
                  fields: value.review?.fields || [],
                });
            }}
          />
        </label>
        <div className="feature-options">
          {Object.entries(REVIEW_LABELS).map(([key, label]) => (
            <label key={key}>
              <input
                type="checkbox"
                disabled={!value.review?.date}
                checked={
                  value.review?.fields.includes(key as ReviewField) || false
                }
                onChange={(e) =>
                  update("review", {
                    date: value.review!.date,
                    fields: e.target.checked
                      ? [...(value.review?.fields || []), key]
                      : (value.review?.fields || []).filter((f) => f !== key),
                  })
                }
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {busy && (
        <p role="status">Esperá a que termine la subida antes de guardar.</p>
      )}
    </section>
  );
}
