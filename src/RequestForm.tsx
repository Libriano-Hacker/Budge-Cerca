import { useEffect, useState } from "react";
import { api } from "./api/client";
import type { AppData, Business } from "./domain";
import type { RequestPayload } from "./catalogApiTypes";
import { validRequest } from "./requestModel";
export default function RequestForm({
  data,
  neighborhood,
  business,
  configured,
  onClose,
}: {
  data: AppData;
  neighborhood: string;
  business?: Business;
  configured: boolean;
  onClose: () => void;
}) {
  const [payload, setPayload] = useState<RequestPayload>(
    business
      ? {
          kind: "correction",
          businessId: business.id,
          neighborhood: business.neighborhood || neighborhood,
          field: "hours",
          note: "",
        }
      : {
          kind: "new",
          neighborhood,
          name: "",
          category: data.categories[0] || "",
          address: "",
          note: "",
        },
  );
  const [token, setToken] = useState(""),
    [consent, setConsent] = useState(false),
    [website, setWebsite] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [sent, setSent] = useState("");
  const update = (key: keyof RequestPayload, value: string) =>
    setPayload((p) => ({ ...p, [key]: value }));
  useEffect(() => {
    if (configured)
      void api<{ token: string }>("/challenge")
        .then((r) => setToken(r.token))
        .catch((e) => setError(e.message));
  }, [configured]);
  if (!configured)
    return (
      <div className="request-form">
        <h3>Recepción de solicitudes pendiente de activar</h3>
        <p>
          Este formulario estará disponible cuando el catálogo compartido esté
          conectado. Todavía no se guardan solicitudes.
        </p>
        <button className="button button-secondary" onClick={onClose}>
          Entendido
        </button>
      </div>
    );
  if (sent)
    return (
      <div className="request-form">
        <h3>Solicitud recibida</h3>
        <p>Quedó pendiente de revisión. No se publicará automáticamente.</p>
        <p>
          Referencia: <strong>{sent}</strong>
        </p>
        <button className="button button-primary" onClick={onClose}>
          Volver al catálogo
        </button>
      </div>
    );
  return (
    <form
      className="request-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setError("");
        if (!validRequest(payload) || !consent) {
          setError("Revisá los datos y aceptá el envío para revisión.");
          return;
        }
        setBusy(true);
        try {
          const result = await api<{ id: string }>("/requests", {
            method: "POST",
            body: JSON.stringify({
              payload,
              consent,
              website,
              challenge: token,
            }),
          });
          setSent(result.id);
        } catch (err) {
          setError(err instanceof Error ? err.message : "No se pudo enviar.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <p>
        {business
          ? `Avisanos qué dato de ${business.name} hay que corregir.`
          : "Proponé tu comercio para el catálogo del barrio. El equipo revisará la información."}
      </p>
      <label>
        Barrio de búsqueda
        <select
          disabled={!!business}
          value={payload.neighborhood}
          onChange={(e) => update("neighborhood", e.target.value)}
        >
          {data.neighborhoods?.map((n) => (
            <option key={n}>{n}</option>
          ))}
        </select>
      </label>
      {business ? (
        <label>
          Dato a corregir
          <select
            value={payload.field}
            onChange={(e) => update("field", e.target.value)}
          >
            <option value="hours">Horarios</option>
            <option value="address">Dirección</option>
            <option value="contact">Contacto</option>
            <option value="other">Otro dato</option>
          </select>
        </label>
      ) : (
        <>
          <label>
            Nombre del comercio
            <input
              required
              maxLength={70}
              value={payload.name || ""}
              onChange={(e) => update("name", e.target.value)}
            />
          </label>
          <label>
            Rubro
            <select
              required
              value={payload.category}
              onChange={(e) => update("category", e.target.value)}
            >
              {data.categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            Dirección
            <input
              required
              maxLength={120}
              value={payload.address || ""}
              onChange={(e) => update("address", e.target.value)}
            />
          </label>
          <label>
            WhatsApp público del comercio (opcional)
            <input
              type="tel"
              maxLength={25}
              placeholder="+54 9 11 1234 5678"
              value={payload.whatsapp || ""}
              onChange={(e) => update("whatsapp", e.target.value)}
            />
          </label>
        </>
      )}
      <label>
        {business ? "Explicá la corrección" : "Contanos qué ofrece el comercio"}
        <textarea
          required
          minLength={10}
          maxLength={1000}
          rows={4}
          value={payload.note}
          onChange={(e) => update("note", e.target.value)}
        />
      </label>
      <fieldset>
        <legend>Contacto privado opcional</legend>
        <p>Solo lo verá el equipo que revisa solicitudes.</p>
        <label>
          Tu nombre
          <input
            maxLength={70}
            value={payload.contactName || ""}
            onChange={(e) => update("contactName", e.target.value)}
          />
        </label>
        <label>
          Correo o WhatsApp con código de país
          <input
            maxLength={254}
            value={payload.contact || ""}
            onChange={(e) => update("contact", e.target.value)}
          />
        </label>
      </fieldset>
      <label className="request-trap" aria-hidden="true">
        Sitio web
        <input
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </label>
      <label className="checkbox-row">
        <input
          type="checkbox"
          required
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
        />
        Acepto enviar estos datos al equipo para su revisión. Confirmo que tengo
        autorización para aportar la información.
      </label>
      <p className="muted">
        No envíes contraseñas, documentación ni información sensible. Los datos
        de contacto privado no se mostrarán en la ficha.
      </p>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <button className="button button-primary" disabled={busy || !token}>
        {busy ? "Enviando…" : "Enviar para revisión"}
      </button>
    </form>
  );
}
