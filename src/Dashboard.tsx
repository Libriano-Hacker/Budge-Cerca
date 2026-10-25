import { useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import {
  ArrowRight,
  Check,
  Download,
  Edit3,
  Info,
  Plus,
  Save,
  Search,
  Settings2,
  Sparkles,
  Store,
  Tag,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import type { AppData, Business, Hours, Settings } from "./domain";
import { isAppData, normalize, validWhatsapp } from "./domain";
import { dayNames } from "./data";
import Modal from "./Modal";

export default function Dashboard({
  data,
  onChange,
}: {
  data: AppData;
  onChange: (data: AppData) => void;
}) {
  const [tab, setTab] = useState<"businesses" | "settings" | "categories">(
    "businesses",
  );
  const [editor, setEditor] = useState<Business | "new" | null>(null);
  const [removing, setRemoving] = useState<Business | null>(null);
  const [imported, setImported] = useState<AppData | null>(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const filtered = data.businesses.filter((b) =>
    normalize(`${b.name} ${b.category}`).includes(normalize(search)),
  );
  function exportData() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `budge-cerca-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function importFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    try {
      if (file.size > 2_000_000)
        throw new Error("El archivo debe pesar menos de 2 MB.");
      const value: unknown = JSON.parse(await file.text());
      if (!isAppData(value))
        throw new Error(
          "El archivo no es una copia válida de esta app. Revisá su formato, rubros, horarios y coordenadas.",
        );
      setImported(value);
    } catch (err) {
      setError(
        err instanceof SyntaxError
          ? "No se pudo leer el JSON. Usá una copia exportada desde esta app."
          : err instanceof Error
            ? err.message
            : "No se pudo abrir el archivo.",
      );
    }
    e.target.value = "";
  }
  function addCategory(e: FormEvent) {
    e.preventDefault();
    setError("");
    const value = newCategory.trim();
    if (
      !value ||
      normalize(value) === "todos" ||
      data.categories.some((c) => normalize(c) === normalize(value))
    ) {
      setError(
        "Elegí un nombre de rubro nuevo. «Todos» está reservado para el buscador.",
      );
      return;
    }
    onChange({ ...data, categories: [...data.categories, value] });
    setNewCategory("");
  }
  return (
    <>
      <div className="dashboard-heading">
        <div>
          <span className="eyebrow">
            <Settings2 size={14} /> ESPACIO DEL CREADOR
          </span>
          <h1>
            Tu barrio, en buenas manos<span>.</span>
          </h1>
          <p>Todo lo que necesitás para hacer crecer tu comunidad.</p>
        </div>
        <button
          className="button button-primary"
          onClick={() => setEditor("new")}
        >
          <Plus size={17} />
          Agregar comercio
        </button>
      </div>
      <div className="dashboard-notice">
        <Info size={20} />
        <p>
          <strong>Estás en el dashboard de demostración.</strong> Los cambios se
          guardan solo en este navegador. No hay cuentas ni publicación
          compartida: para usarlo con clientes reales hace falta conectar una
          base de datos y proteger el acceso del administrador.
        </p>
      </div>
      <div className="stat-grid">
        <div>
          <span>
            <Store size={18} />
            Comercios
          </span>
          <strong>{data.businesses.length}</strong>
          <small>Parte de tu comunidad</small>
        </div>
        <div>
          <span>
            <Sparkles size={18} />
            Destacados
          </span>
          <strong>{data.businesses.filter((b) => b.featured).length}</strong>
          <small>Se muestran hasta 3 en el inicio</small>
        </div>
        <div>
          <span>
            <Tag size={18} />
            Promociones
          </span>
          <strong>
            {data.businesses.filter((b) => b.promotion.trim()).length}
          </strong>
          <small>Oportunidades para los vecinos</small>
        </div>
        <div>
          <span>
            <Settings2 size={18} />
            Rubros
          </span>
          <strong>{data.categories.length}</strong>
          <small>Siempre podés sumar más</small>
        </div>
      </div>
      <div className="admin-panel">
        <div
          className="admin-tabs"
          role="tablist"
          aria-label="Secciones del dashboard"
        >
          {(
            [
              ["businesses", "Comercios"],
              ["settings", "Mi barrio"],
              ["categories", "Rubros"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              role="tab"
              aria-selected={tab === key}
              id={`tab-${key}`}
              aria-controls="admin-content"
              onClick={() => {
                setTab(key);
                setError("");
              }}
            >
              {label}
            </button>
          ))}
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div role="tabpanel" id="admin-content" aria-labelledby={`tab-${tab}`}>
          {tab === "businesses" && (
            <>
              <div className="admin-toolbar">
                <div className="admin-search">
                  <Search size={17} />
                  <input
                    aria-label="Buscar en dashboard"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar comercio o rubro…"
                  />
                </div>
                <div>
                  <button className="button button-ghost" onClick={exportData}>
                    <Download size={15} />
                    Exportar
                  </button>
                  <button
                    className="button button-ghost"
                    onClick={() => fileRef.current?.click()}
                  >
                    <Upload size={15} />
                    Importar
                  </button>
                  <input
                    type="file"
                    accept="application/json,.json"
                    ref={fileRef}
                    onChange={importFile}
                    className="sr-only"
                    aria-label="Importar copia de seguridad"
                  />
                </div>
              </div>
              <div className="table-scroll">
                <table className="business-table">
                  <thead>
                    <tr>
                      <th>Comercio</th>
                      <th>Rubro</th>
                      <th>Visibilidad</th>
                      <th>Promoción</th>
                      <th>
                        <span className="sr-only">Acciones</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((b) => (
                      <tr key={b.id}>
                        <td>
                          <div className="table-business">
                            <span className={`business-avatar ${b.color}`}>
                              {b.initials}
                            </span>
                            <div>
                              <strong>{b.name}</strong>
                              <small>{b.address}</small>
                            </div>
                          </div>
                        </td>
                        <td>{b.category}</td>
                        <td>
                          <button
                            className={`table-featured ${b.featured ? "active" : ""}`}
                            aria-pressed={b.featured}
                            aria-label={`${b.featured ? "Quitar" : "Marcar"} ${b.name} como destacado`}
                            onClick={() =>
                              onChange({
                                ...data,
                                businesses: data.businesses.map((x) =>
                                  x.id === b.id
                                    ? { ...x, featured: !x.featured }
                                    : x,
                                ),
                              })
                            }
                          >
                            <Sparkles size={13} />
                            {b.featured ? "Destacado" : "Estándar"}
                          </button>
                        </td>
                        <td>
                          {b.promotion ? (
                            <span className="promo-status">
                              <span className="status-dot open" />
                              Con promoción
                            </span>
                          ) : (
                            <span className="muted">Sin promoción</span>
                          )}
                        </td>
                        <td>
                          <div className="table-actions">
                            <button
                              className="icon-button"
                              aria-label={`Editar ${b.name}`}
                              onClick={() => setEditor(b)}
                            >
                              <Edit3 size={16} />
                            </button>
                            <button
                              className="icon-button delete-button"
                              aria-label={`Eliminar ${b.name}`}
                              onClick={() => setRemoving(b)}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!filtered.length && (
                  <div className="empty-state">
                    <Store size={32} />
                    <h3>No hay comercios para mostrar</h3>
                    <p>Agregá tu primer comercio o probá con otra búsqueda.</p>
                  </div>
                )}
              </div>
            </>
          )}
          {tab === "settings" && (
            <SettingsForm
              key={JSON.stringify(data.settings)}
              settings={data.settings}
              onSave={(settings) => onChange({ ...data, settings })}
            />
          )}
          {tab === "categories" && (
            <div className="categories-admin">
              <h2>Un lugar para cada rubro</h2>
              <p>
                Sumá nuevas categorías para que los vecinos encuentren más fácil
                lo que buscan.
              </p>
              <form onSubmit={addCategory} className="add-category-form">
                <label className="sr-only" htmlFor="new-category">
                  Nombre del nuevo rubro
                </label>
                <input
                  id="new-category"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  required
                  maxLength={50}
                  placeholder="Por ejemplo: Farmacias"
                />
                <button className="button button-primary">
                  <Plus size={16} />
                  Agregar rubro
                </button>
              </form>
              <div className="admin-category-list">
                {data.categories.map((c) => {
                  const count = data.businesses.filter(
                    (b) => b.category === c,
                  ).length;
                  return (
                    <div key={c}>
                      <span>
                        <Store size={16} />
                        {c}
                        <small>
                          {count} {count === 1 ? "comercio" : "comercios"}
                        </small>
                      </span>
                      <button
                        className="icon-button delete-button"
                        disabled={count > 0}
                        title={
                          count > 0
                            ? "Reasigná sus comercios antes de eliminar el rubro"
                            : "Eliminar rubro"
                        }
                        aria-label={`Eliminar rubro ${c}`}
                        onClick={() =>
                          onChange({
                            ...data,
                            categories: data.categories.filter((x) => x !== c),
                          })
                        }
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  );
                })}
              </div>
              <p className="muted">
                Los rubros con comercios asignados no se pueden eliminar.
              </p>
            </div>
          )}
        </div>
      </div>
      <p className="admin-footnote">
        <ShieldNote />
        Exportá una copia para conservar tus datos o llevarlos a otro
        dispositivo.
      </p>
      {editor && (
        <Modal
          title={
            editor === "new"
              ? "Sumá un comercio al barrio"
              : `Editar ${editor.name}`
          }
          onClose={() => setEditor(null)}
          wide
        >
          <BusinessForm
            categories={data.categories}
            business={editor === "new" ? null : editor}
            onSave={(business) => {
              onChange({
                ...data,
                businesses:
                  editor === "new"
                    ? [...data.businesses, business]
                    : data.businesses.map((b) =>
                        b.id === business.id ? business : b,
                      ),
              });
              setEditor(null);
            }}
            onCancel={() => setEditor(null)}
          />
        </Modal>
      )}
      {removing && (
        <Modal
          title="¿Eliminar este comercio?"
          onClose={() => setRemoving(null)}
        >
          <div className="confirm-body">
            <p>
              <strong>{removing.name}</strong> dejará de aparecer en este
              navegador. Esta acción no se puede deshacer; podés exportar una
              copia antes.
            </p>
            <div className="form-actions">
              <button
                className="button button-secondary"
                onClick={() => setRemoving(null)}
              >
                Cancelar
              </button>
              <button
                className="button button-danger"
                onClick={() => {
                  onChange({
                    ...data,
                    businesses: data.businesses.filter(
                      (b) => b.id !== removing.id,
                    ),
                  });
                  setRemoving(null);
                }}
              >
                Eliminar comercio
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        </Modal>
      )}
      {imported && (
        <Modal
          title="Importar copia de seguridad"
          onClose={() => setImported(null)}
        >
          <div className="confirm-body">
            <p>
              Esta copia contiene{" "}
              <strong>{imported.businesses.length} comercios</strong> y{" "}
              <strong>{imported.categories.length} rubros</strong> para{" "}
              {imported.settings.neighborhood}. Reemplazará los datos actuales
              de este navegador.
            </p>
            <p>
              Exportá tus datos actuales antes de continuar si querés
              conservarlos.
            </p>
            <div className="form-actions">
              <button
                className="button button-secondary"
                onClick={() => setImported(null)}
              >
                Cancelar
              </button>
              <button
                className="button button-primary"
                onClick={() => {
                  onChange(imported);
                  setImported(null);
                }}
              >
                Reemplazar datos
                <Upload size={16} />
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
function ShieldNote() {
  return <Download size={15} />;
}
function SettingsForm({
  settings,
  onSave,
}: {
  settings: Settings;
  onSave: (settings: Settings) => void;
}) {
  const [draft, setDraft] = useState(settings);
  const [error, setError] = useState("");
  const change = (key: keyof Settings, value: string) =>
    setDraft({ ...draft, [key]: value });
  function save(e: FormEvent) {
    e.preventDefault();
    if (
      !draft.appName.trim() ||
      !draft.neighborhood.trim() ||
      !draft.intro.trim()
    ) {
      setError("Completá el nombre de la app, el barrio y la presentación.");
      return;
    }
    if (draft.ownerWhatsapp.trim() && !validWhatsapp(draft.ownerWhatsapp)) {
      setError(
        "Ingresá un WhatsApp con código de país, sin el 0 ni el 15. Por ejemplo: +54 9 11 1234 5678.",
      );
      return;
    }
    onSave({
      appName: draft.appName.trim(),
      neighborhood: draft.neighborhood.trim(),
      ownerWhatsapp: draft.ownerWhatsapp.trim(),
      intro: draft.intro.trim(),
    });
  }
  return (
    <form className="settings-form" onSubmit={save}>
      <div className="form-intro">
        <h2>Una app con la identidad de tu barrio</h2>
        <p>
          Estos datos se muestran en la portada y en el botón de contacto del
          creador.
        </p>
      </div>
      <div className="form-grid">
        <label>
          Nombre de la aplicación
          <input
            required
            maxLength={35}
            value={draft.appName}
            onChange={(e) => change("appName", e.target.value)}
          />
        </label>
        <label>
          Nombre del barrio
          <input
            required
            maxLength={60}
            value={draft.neighborhood}
            onChange={(e) => change("neighborhood", e.target.value)}
          />
        </label>
        <label className="full-width">
          Tu WhatsApp de contacto
          <input
            type="tel"
            maxLength={25}
            value={draft.ownerWhatsapp}
            onChange={(e) => change("ownerWhatsapp", e.target.value)}
            placeholder="+54 9 11 1234 5678"
          />
          <small>
            Código internacional, sin el 0 ni el 15. Si queda vacío, se
            desactiva el contacto.
          </small>
        </label>
        <label className="full-width">
          Presentación de la app
          <textarea
            required
            rows={3}
            maxLength={260}
            value={draft.intro}
            onChange={(e) => change("intro", e.target.value)}
          />
        </label>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button className="button button-primary">
        <Save size={16} />
        Guardar mi barrio
      </button>
      <p className="muted settings-note">
        Podés cambiar la marca para otro barrio. Esta demo conserva una sola
        configuración por navegador; la administración de varios barrios
        requiere un servidor.
      </p>
    </form>
  );
}
function BusinessForm({
  business,
  categories,
  onSave,
  onCancel,
}: {
  business: Business | null;
  categories: string[];
  onSave: (business: Business) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState({
    name: business?.name || "",
    description: business?.description || "",
    address: business?.address || "",
    category: business?.category || categories[0] || "",
    whatsapp: business?.whatsapp || "",
    promotion: business?.promotion || "",
    featured: business?.featured || false,
    color: business?.color || "sand",
    lat: business ? String(business.coordinates.lat) : "",
    lng: business ? String(business.coordinates.lng) : "",
  });
  const [hours, setHours] = useState<Hours[]>(
    business?.hours.map((h) => ({ ...h, days: [...h.days] })) || [
      { days: [1, 2, 3, 4, 5, 6], opens: "09:00", closes: "20:00" },
    ],
  );
  const [error, setError] = useState("");
  const change = (key: keyof typeof draft, value: string | boolean) =>
    setDraft((prev) => ({ ...prev, [key]: value }));
  function submit(e: FormEvent) {
    e.preventDefault();
    if (
      !draft.name.trim() ||
      !draft.address.trim() ||
      !draft.description.trim() ||
      !draft.category
    ) {
      setError("Completá el nombre, rubro, dirección y descripción.");
      return;
    }
    if (draft.whatsapp.trim() && !validWhatsapp(draft.whatsapp)) {
      setError("El WhatsApp debe tener código de país y entre 8 y 15 dígitos.");
      return;
    }
    if (
      !draft.lat.trim() ||
      !draft.lng.trim() ||
      !Number.isFinite(Number(draft.lat)) ||
      !Number.isFinite(Number(draft.lng)) ||
      Math.abs(Number(draft.lat)) > 90 ||
      Math.abs(Number(draft.lng)) > 180
    ) {
      setError(
        "Ingresá una latitud entre -90 y 90 y una longitud entre -180 y 180.",
      );
      return;
    }
    if (
      hours.some(
        (h) => !h.days.length || !h.opens || !h.closes || h.opens === h.closes,
      )
    ) {
      setError(
        "Cada franja horaria debe tener al menos un día y horarios de apertura y cierre distintos.",
      );
      return;
    }
    onSave({
      id: business?.id || crypto.randomUUID(),
      name: draft.name.trim(),
      description: draft.description.trim(),
      address: draft.address.trim(),
      category: draft.category,
      whatsapp: draft.whatsapp.trim(),
      promotion: draft.promotion.trim(),
      featured: draft.featured,
      color: draft.color,
      coordinates: { lat: Number(draft.lat), lng: Number(draft.lng) },
      initials: draft.name
        .trim()
        .split(/\s+/)
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase(),
      hours,
    });
  }
  return (
    <form className="business-form" onSubmit={submit}>
      <p className="form-hint">
        Los campos con * son obligatorios. Cargá información real antes de
        compartir un comercio.
      </p>
      <div className="form-grid">
        <label>
          Nombre del comercio *
          <input
            required
            maxLength={70}
            value={draft.name}
            onChange={(e) => change("name", e.target.value)}
            placeholder="Ej.: Panadería La Familia"
          />
        </label>
        <label>
          Rubro *
          <select
            required
            value={draft.category}
            onChange={(e) => change("category", e.target.value)}
          >
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="full-width">
          Descripción *
          <textarea
            required
            maxLength={450}
            rows={3}
            value={draft.description}
            onChange={(e) => change("description", e.target.value)}
            placeholder="Contá qué ofrece y qué lo hace especial"
          />
        </label>
        <label>
          Dirección *
          <input
            required
            maxLength={120}
            value={draft.address}
            onChange={(e) => change("address", e.target.value)}
            placeholder="Calle y número"
          />
        </label>
        <label>
          WhatsApp
          <input
            aria-label="WhatsApp"
            type="tel"
            maxLength={25}
            value={draft.whatsapp}
            onChange={(e) => change("whatsapp", e.target.value)}
            placeholder="+54 9 11 1234 5678"
          />
          <small>Si no tiene número, dejalo vacío.</small>
        </label>
      </div>
      <fieldset className="form-fieldset">
        <legend>Ubicación del comercio</legend>
        <p>
          Copiá las coordenadas exactas desde Google Maps (clic derecho o
          mantené presionado sobre el lugar).
        </p>
        <div className="form-grid">
          <label>
            Latitud *
            <input
              type="number"
              min={-90}
              max={90}
              step="any"
              required
              value={draft.lat}
              onChange={(e) => change("lat", e.target.value)}
              placeholder="Ej.: -34.7203"
            />
          </label>
          <label>
            Longitud *
            <input
              type="number"
              min={-180}
              max={180}
              step="any"
              required
              value={draft.lng}
              onChange={(e) => change("lng", e.target.value)}
              placeholder="Ej.: -58.4555"
            />
          </label>
        </div>
      </fieldset>
      <fieldset className="form-fieldset">
        <legend>Horarios de atención</legend>
        <p>
          Hora de Argentina. Agregá franjas para horarios cortados o días
          diferentes. Un cierre menor a la apertura corresponde al día
          siguiente.
        </p>
        {hours.map((h, i) => (
          <div className="schedule-row" key={i}>
            <div
              className="schedule-days"
              role="group"
              aria-label={`Días de la franja ${i + 1}`}
            >
              {dayNames.map((name, d) => (
                <button
                  key={d}
                  type="button"
                  aria-pressed={h.days.includes(d)}
                  className={h.days.includes(d) ? "active" : ""}
                  onClick={() =>
                    setHours(
                      hours.map((x, j) =>
                        j === i
                          ? {
                              ...x,
                              days: x.days.includes(d)
                                ? x.days.filter((v) => v !== d)
                                : [...x.days, d].sort(),
                            }
                          : x,
                      ),
                    )
                  }
                >
                  {name}
                </button>
              ))}
            </div>
            <div className="schedule-times">
              <label>
                Abre
                <input
                  type="time"
                  required
                  value={h.opens}
                  onChange={(e) =>
                    setHours(
                      hours.map((x, j) =>
                        j === i ? { ...x, opens: e.target.value } : x,
                      ),
                    )
                  }
                />
              </label>
              <ArrowRight size={14} />
              <label>
                Cierra
                <input
                  type="time"
                  required
                  value={h.closes}
                  onChange={(e) =>
                    setHours(
                      hours.map((x, j) =>
                        j === i ? { ...x, closes: e.target.value } : x,
                      ),
                    )
                  }
                />
              </label>
              <button
                className="icon-button delete-button"
                type="button"
                aria-label={`Eliminar franja ${i + 1}`}
                onClick={() => setHours(hours.filter((_, j) => j !== i))}
              >
                <X size={16} />
              </button>
            </div>
          </div>
        ))}
        {!hours.length && (
          <p>Sin horarios: se mostrará «Consultá los horarios al comercio».</p>
        )}
        <button
          type="button"
          className="text-link"
          onClick={() =>
            setHours([
              ...hours,
              { days: [1, 2, 3, 4, 5], opens: "09:00", closes: "13:00" },
            ])
          }
        >
          <Plus size={15} />
          Agregar franja horaria
        </button>
      </fieldset>
      <div className="form-grid">
        <label className="full-width">
          Promoción (opcional)
          <textarea
            maxLength={300}
            rows={2}
            value={draft.promotion}
            onChange={(e) => change("promotion", e.target.value)}
            placeholder="Beneficio, condiciones y fecha de vigencia. Vacío = sin promoción."
          />
        </label>
        <label>
          Color de la tarjeta
          <select
            value={draft.color}
            onChange={(e) => change("color", e.target.value)}
          >
            <option value="sand">Arena</option>
            <option value="sage">Salvia</option>
            <option value="rose">Rosa</option>
            <option value="blue">Azul</option>
            <option value="lilac">Lavanda</option>
            <option value="peach">Durazno</option>
          </select>
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={draft.featured}
            onChange={(e) => change("featured", e.target.checked)}
          />
          <span>
            Destacar en la portada
            <small>Se muestran los primeros 3 destacados.</small>
          </span>
        </label>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="form-actions">
        <button
          type="button"
          className="button button-secondary"
          onClick={onCancel}
        >
          Cancelar
        </button>
        <button className="button button-primary">
          <Check size={16} />
          {business ? "Guardar comercio" : "Agregar comercio"}
        </button>
      </div>
    </form>
  );
}
