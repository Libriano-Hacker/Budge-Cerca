import { useEffect, useState } from "react";
import { LogOut, Plus, RefreshCw, ShieldCheck, Store } from "lucide-react";
import {
  api,
  apiConfig,
  loadSession,
  login,
  logout,
  verifyMfa,
  ApiFailure,
  setSession as setApiSession,
} from "../api/client";
import type { SessionResult } from "../api/client";
import type {
  AdminCatalog,
  AdminSession,
  CatalogRecord,
  CatalogRequest,
  CatalogHistory,
  ApiConfig,
} from "../catalogApiTypes";
import type { AppData, Business } from "../domain";
import { isAppData } from "../domain";
import { BusinessForm } from "../Dashboard";
import BusinessDetailsView from "../BusinessDetailsView";
import BusinessPhoto from "../BusinessPhoto";
import { qualityIssues, QUALITY_LABELS } from "../catalogInsights";
import Modal from "../Modal";
import { dayNames } from "../data";

type Editor = { record: CatalogRecord | null; request?: CatalogRequest };
const textError = (e: unknown) =>
  e instanceof Error ? e.message : "No se pudo completar la operación.";
export default function AdminPortal() {
  const [config, setConfig] = useState<ApiConfig | null>(null),
    [session, setSession] = useState<SessionResult | null>(null),
    [catalog, setCatalog] = useState<AdminCatalog | null>(null);
  const [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [tab, setTab] = useState("businesses");
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [code, setCode] = useState("");
  const [editor, setEditor] = useState<Editor | null>(null),
    [preview, setPreview] = useState<CatalogRecord | null>(null),
    [history, setHistory] = useState<{
      record: CatalogRecord;
      items: CatalogHistory[];
    } | null>(null);
  const [confirm, setConfirm] = useState<{
      title: string;
      description: string;
      action: () => Promise<unknown>;
    } | null>(null),
    [review, setReview] = useState<{
      request: CatalogRequest;
      status: "needs_changes" | "rejected";
    } | null>(null),
    [reviewNote, setReviewNote] = useState("");
  const [area, setArea] = useState(""),
    [search, setSearch] = useState(""),
    [issueType, setIssueType] = useState("");
  const admin =
    session && !("requiresMfa" in session) ? (session as AdminSession) : null;
  function clearPrivate() {
    setSession(null);
    setApiSession(null);
    setCatalog(null);
    setEditor(null);
    setPreview(null);
    setHistory(null);
    setReview(null);
    setConfirm(null);
    setPassword("");
    setCode("");
    setSearch("");
    setArea("");
    setReviewNote("");
    setNotice("");
    setTab("businesses");
  }
  function handleError(error: unknown) {
    setError(textError(error));
    if (error instanceof ApiFailure && [401, 403].includes(error.status))
      clearPrivate();
  }
  async function refresh() {
    const result = await api<AdminCatalog>("/admin/catalog");
    setCatalog(result);
  }
  useEffect(() => {
    document.title = "Gestión · Tu Barrio Cerca";
    let alive = true;
    void (async () => {
      const c = await apiConfig();
      if (!alive) return;
      setConfig(c);
      if (c.configured)
        try {
          const s = await loadSession();
          if (alive) setSession(s);
        } catch (e) {
          if (e instanceof ApiFailure && e.status !== 401 && alive)
            setError(e.message);
        }
    })();
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    if (admin) void refresh().catch(handleError);
  }, [admin?.user.id]);
  async function perform(action: () => Promise<unknown>, message: string) {
    setError("");
    setNotice("");
    setBusy(true);
    try {
      await action();
      await refresh();
      setNotice(message);
      return true;
    } catch (e) {
      handleError(e);
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function saveBusiness(business: Business) {
    if (!editor) return;
    const current = editor;
    const ok = await perform(
      () =>
        current.request
          ? api(`/admin/requests/${current.request.id}/draft`, {
              method: "POST",
              body: JSON.stringify({
                expectedRevision: current.request.revision,
                business,
                businessRevision: current.record?.revision || 0,
              }),
            })
          : api(`/admin/businesses/${business.id}/draft`, {
              method: "PUT",
              body: JSON.stringify({
                business,
                expectedRevision: current.record?.revision || 0,
              }),
            }),
      "Borrador guardado. Revisalo en vista previa antes de publicarlo.",
    );
    if (ok) setEditor(null);
  }
  const [previewMode, setPreviewMode] = useState<"draft" | "published">(
    "draft",
  );
  function previewBusiness(record: CatalogRecord) {
    setPreviewMode(record.draft ? "draft" : "published");
    setPreview(record);
  }
  const records = (catalog?.records || []).filter(
    (r) =>
      (!area || r.neighborhood === area) &&
      `${r.draft?.name || r.published?.name || r.id} ${r.neighborhood}`
        .toLocaleLowerCase()
        .includes(search.toLocaleLowerCase()),
  );
  const effective = (catalog?.records || [])
    .filter((r) => !r.archived)
    .map((r) => r.draft || r.published)
    .filter((b): b is Business => !!b);
  const issues = qualityIssues(effective).filter(
    (i) =>
      (!area || i.neighborhood === area) &&
      (!issueType || i.kind === issueType),
  );
  const neighborhoods =
    admin?.access.role === "owner"
      ? catalog?.data.neighborhoods || []
      : (catalog?.data.neighborhoods || []).filter((n) =>
          admin?.access.neighborhoods.includes(n),
        );
  function openRequest(request: CatalogRequest) {
    const record =
      catalog?.records.find((r) => r.id === request.business_id) || null;
    if (request.kind === "correction" && !record) {
      setError("La ficha ya no está disponible para esta cuenta.");
      return;
    }
    setEditor({ record, request });
  }
  function exportBackup() {
    if (!catalog) return;
    const data = { ...catalog.data, businesses: effective };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `catalogo-borradores-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <div className="trusted-admin">
      <header className="trusted-header">
        <a href="/" className="footer-brand">
          <Store size={24} />
          Tu Barrio Cerca
        </a>
        <span>
          <ShieldCheck size={17} />
          Gestión del catálogo
        </span>
        {admin && (
          <button
            className="button button-secondary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await logout();
                clearPrivate();
              } catch (e) {
                setApiSession(session);
                handleError(e);
              } finally {
                setBusy(false);
              }
            }}
          >
            <LogOut size={16} />
            Salir
          </button>
        )}
      </header>
      <main className="container trusted-main">
        {error && (
          <p role="alert" className="notice warning">
            {error}
            {error.includes("otra sesión") &&
              " Cerrá el editor y recargá el catálogo para revisar la última versión."}
          </p>
        )}
        {notice && (
          <p role="status" className="notice">
            {notice}
          </p>
        )}
        {!config ? (
          <p role="status">Comprobando conexión segura…</p>
        ) : !config.configured ? (
          <section className="auth-card">
            <ShieldCheck size={32} />
            <h1>Activación pendiente</h1>
            <p>
              La administración compartida está preparada para Supabase. Primero
              hay que crear el proyecto, ejecutar las migraciones y configurar
              las variables privadas en Netlify.
            </p>
            <p>
              No se admiten contraseñas ni publicaciones hasta completar esa
              conexión.
            </p>
            <a className="button button-primary" href="/">
              Volver a explorar
            </a>
          </section>
        ) : !admin ? (
          <section className="auth-card">
            <span className="eyebrow">ACCESO PRIVADO</span>
            <h1>
              {session && "requiresMfa" in session
                ? "Verificación en dos pasos"
                : "Gestioná tu comunidad."}
            </h1>
            {config.mode === "test" && (
              <p className="notice">
                Entorno de prueba local. No contiene cuentas ni datos reales.
              </p>
            )}
            {session && "requiresMfa" in session ? (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setBusy(true);
                  setError("");
                  try {
                    setSession(await verifyMfa(code));
                    setCode("");
                  } catch (err) {
                    setError(textError(err));
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <label>
                  Código del autenticador
                  <input
                    required
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                  />
                </label>
                <button className="button button-primary" disabled={busy}>
                  Verificar acceso
                </button>
              </form>
            ) : (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setBusy(true);
                  setError("");
                  try {
                    setSession(await login(email, password));
                    setPassword("");
                  } catch (err) {
                    setError(textError(err));
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <label>
                  Correo del administrador
                  <input
                    required
                    type="email"
                    autoComplete="username"
                    maxLength={254}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </label>
                <label>
                  Contraseña
                  <input
                    required
                    type="password"
                    autoComplete="current-password"
                    minLength={8}
                    maxLength={1024}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </label>
                <button className="button button-primary" disabled={busy}>
                  {busy ? "Verificando…" : "Ingresar"}
                </button>
              </form>
            )}
            <p>
              Solo las cuentas habilitadas por el propietario pueden administrar
              comercios. Contactá al propietario si necesitás recuperar el
              acceso.
            </p>
          </section>
        ) : !catalog ? (
          <p role="status">Cargando catálogo privado…</p>
        ) : (
          <>
            <div className="dashboard-heading">
              <div>
                <span className="eyebrow">
                  {admin.access.role === "owner"
                    ? "PROPIETARIO"
                    : "ADMINISTRADOR"}{" "}
                  · {admin.user.email}
                </span>
                <h1>
                  Información que da confianza<span>.</span>
                </h1>
                <p>Prepará, revisá y publicá cada ficha cuando esté lista.</p>
              </div>
              <div className="inline-actions">
                <button
                  className="button button-secondary"
                  disabled={busy}
                  onClick={() => void perform(refresh, "Catálogo actualizado.")}
                >
                  <RefreshCw size={16} />
                  Recargar
                </button>
                <button
                  className="button button-primary"
                  disabled={
                    busy ||
                    !neighborhoods.length ||
                    !catalog.data.categories.length
                  }
                  onClick={() => setEditor({ record: null })}
                >
                  <Plus size={17} />
                  Nuevo comercio
                </button>
              </div>
            </div>
            <div className="stat-grid">
              <div>
                <span>Publicados</span>
                <strong>
                  {
                    catalog.records.filter((r) => r.published && !r.archived)
                      .length
                  }
                </strong>
                <small>Visibles para los vecinos</small>
              </div>
              <div>
                <span>Borradores</span>
                <strong>
                  {catalog.records.filter((r) => r.draft && !r.archived).length}
                </strong>
                <small>Requieren publicación</small>
              </div>
              <div>
                <span>Solicitudes</span>
                <strong>{catalog.requests.length}</strong>
                <small>Hasta 100 pendientes, primero las más antiguas</small>
              </div>
              <div>
                <span>Datos por revisar</span>
                <strong>{qualityIssues(effective).length}</strong>
                <small>Observaciones, no calificaciones</small>
              </div>
            </div>
            <div className="admin-panel">
              <nav className="admin-tabs" aria-label="Secciones de gestión">
                {[
                  ["businesses", "Comercios"],
                  ["requests", "Solicitudes"],
                  ["quality", "Calidad de datos"],
                  ...(admin.access.role === "owner"
                    ? [["settings", "Configuración"]]
                    : []),
                ].map(([key, label]) => (
                  <button
                    key={key}
                    aria-current={tab === key ? "page" : undefined}
                    className={tab === key ? "active" : ""}
                    onClick={() => {
                      setTab(key);
                      setArea("");
                    }}
                  >
                    {label}
                  </button>
                ))}
              </nav>
              {tab !== "settings" && (
                <div className="trusted-filters">
                  <label>
                    Barrio
                    <select
                      value={area}
                      onChange={(e) => setArea(e.target.value)}
                    >
                      <option value="">Todos los asignados</option>
                      {neighborhoods.map((n) => (
                        <option key={n}>{n}</option>
                      ))}
                    </select>
                  </label>
                  {tab === "businesses" && (
                    <label>
                      Buscar en el catálogo
                      <input
                        maxLength={120}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </label>
                  )}
                  {tab === "quality" && (
                    <label>
                      Observación
                      <select
                        value={issueType}
                        onChange={(e) => setIssueType(e.target.value)}
                      >
                        <option value="">Todas</option>
                        {[
                          ...new Set(
                            qualityIssues(effective).map((i) => i.kind),
                          ),
                        ].map((kind) => (
                          <option key={kind} value={kind}>
                            {QUALITY_LABELS[kind]}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                </div>
              )}
              {tab === "businesses" && (
                <div className="trusted-list">
                  {!records.length && (
                    <div className="empty-state">
                      <h2>El catálogo empieza acá.</h2>
                      <p>
                        Agregá información real, guardala como borrador y
                        revisala antes de publicar.
                      </p>
                    </div>
                  )}
                  {records.map((r) => (
                    <article key={r.id}>
                      <div>
                        <strong>
                          {r.draft?.name || r.published?.name || r.id}
                        </strong>
                        <p>
                          {r.neighborhood} ·{" "}
                          {r.draft?.category || r.published?.category}
                        </p>
                        <span className="catalog-state">
                          {r.archived
                            ? "Archivado"
                            : r.draft
                              ? r.published
                                ? "Publicado · cambios en borrador"
                                : "Borrador privado"
                              : "Publicado"}
                        </span>
                        <small>Versión {r.revision}</small>
                      </div>
                      <div className="inline-actions">
                        {!r.archived && (
                          <>
                            <button
                              className="button button-secondary"
                              disabled={busy}
                              onClick={() => setEditor({ record: r })}
                            >
                              Editar
                            </button>
                            <button
                              className="button button-secondary"
                              disabled={busy}
                              onClick={() => previewBusiness(r)}
                            >
                              Vista previa
                            </button>
                          </>
                        )}
                        <button
                          className="button button-secondary"
                          disabled={busy}
                          onClick={() =>
                            void perform(async () => {
                              const items = await api<CatalogHistory[]>(
                                `/admin/businesses/${r.id}/history`,
                              );
                              setHistory({ record: r, items });
                            }, "Historial cargado.")
                          }
                        >
                          Historial
                        </button>
                        {!r.archived && (
                          <button
                            className="text-action"
                            disabled={busy}
                            onClick={() =>
                              setConfirm({
                                title: "Archivar comercio",
                                description:
                                  "Se retirará del catálogo público. El historial se conserva para recuperar una versión como borrador.",
                                action: () =>
                                  api(`/admin/businesses/${r.id}`, {
                                    method: "DELETE",
                                    body: JSON.stringify({
                                      expectedRevision: r.revision,
                                    }),
                                  }),
                              })
                            }
                          >
                            Archivar
                          </button>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              )}
              {tab === "requests" && (
                <div className="trusted-list">
                  {!catalog.requests.length && (
                    <p className="empty-state">
                      No hay solicitudes pendientes.
                    </p>
                  )}
                  {catalog.requests
                    .filter((r) => !area || r.neighborhood === area)
                    .sort((a, b) => a.created_at.localeCompare(b.created_at))
                    .map((r) => (
                      <article key={r.id}>
                        <div>
                          <span className="catalog-state">
                            {r.kind === "new"
                              ? "Solicitud de alta"
                              : "Corrección"}{" "}
                            ·{" "}
                            {r.status === "needs_changes"
                              ? "Faltan datos"
                              : "Pendiente"}
                          </span>
                          <h3>
                            {r.payload.name ||
                              catalog.records.find(
                                (b) => b.id === r.business_id,
                              )?.published?.name ||
                              "Corrección de ficha"}
                          </h3>
                          <p>
                            {r.neighborhood} ·{" "}
                            {r.payload.address || r.payload.field}
                          </p>
                          <p className="preserve-lines">{r.payload.note}</p>
                          {r.payload.contact && (
                            <p>
                              Contacto privado: {r.payload.contactName} ·{" "}
                              {r.payload.contact}
                            </p>
                          )}
                          {r.review_note && (
                            <p>Nota interna: {r.review_note}</p>
                          )}
                          <small>
                            {new Date(r.created_at).toLocaleString("es-AR")} ·{" "}
                            {r.id}
                          </small>
                        </div>
                        <div className="inline-actions">
                          <button
                            className="button button-primary"
                            disabled={busy}
                            onClick={() => openRequest(r)}
                          >
                            Revisar y preparar borrador
                          </button>
                          <button
                            className="button button-secondary"
                            disabled={busy}
                            onClick={() => {
                              setReview({
                                request: r,
                                status: "needs_changes",
                              });
                              setReviewNote("");
                            }}
                          >
                            Marcar datos faltantes
                          </button>
                          <button
                            className="text-action"
                            disabled={busy}
                            onClick={() => {
                              setReview({ request: r, status: "rejected" });
                              setReviewNote("");
                            }}
                          >
                            Rechazar
                          </button>
                        </div>
                      </article>
                    ))}
                  <p className="muted">
                    Las notas de revisión son internas. No se envían mensajes
                    automáticos. Aprobar una solicitud crea un borrador; la
                    publicación se confirma por separado.
                  </p>
                </div>
              )}
              {tab === "quality" && (
                <div className="trusted-list">
                  <p className="muted">
                    Se revisa la versión de trabajo más reciente. Un posible
                    duplicado requiere verificación manual; nunca se elimina
                    automáticamente.
                  </p>
                  {!issues.length && (
                    <p className="empty-state">
                      No hay observaciones con estos filtros.
                    </p>
                  )}
                  {issues.map((i, n) => (
                    <article key={`${i.businessId}-${i.kind}-${n}`}>
                      <div>
                        <strong>{i.businessName}</strong>
                        <p>{i.message}</p>
                        <small>{i.neighborhood}</small>
                      </div>
                      <button
                        className="button button-secondary"
                        onClick={() =>
                          setEditor({
                            record: catalog.records.find(
                              (r) => r.id === i.businessId,
                            )!,
                          })
                        }
                      >
                        Revisar ficha
                      </button>
                    </article>
                  ))}
                </div>
              )}
              {tab === "settings" && admin.access.role === "owner" && (
                <MetadataForm
                  key={catalog.revision}
                  data={catalog.data}
                  busy={busy}
                  onSave={(data) =>
                    setConfirm({
                      title: "Publicar configuración",
                      description:
                        "El nombre, los barrios, los rubros y el contacto se actualizarán para todos los usuarios. Los comercios con borradores no se publicarán.",
                      action: () =>
                        api("/admin/settings", {
                          method: "PUT",
                          body: JSON.stringify({
                            data,
                            expectedRevision: catalog.revision,
                          }),
                        }),
                    })
                  }
                />
              )}
            </div>
            <p className="muted">
              <button className="text-action" onClick={exportBackup}>
                Exportar copia JSON de la versión de trabajo
              </button>{" "}
              · Incluye fichas en borrador; no contiene solicitudes privadas ni
              credenciales.
            </p>
          </>
        )}
      </main>
      {editor && catalog && admin && (
        <Modal
          title={
            editor.request
              ? "Revisar solicitud"
              : editor.record
                ? "Editar borrador"
                : "Nuevo comercio"
          }
          onClose={() => {
            if (!busy) setEditor(null);
          }}
        >
          <div className="trusted-editor">
            {editor.request && (
              <div className="notice">
                <p>{editor.request.payload.note}</p>
                <small>
                  Completá los datos faltantes. La aprobación guardará un
                  borrador privado.
                </small>
              </div>
            )}
            <BusinessForm
              business={
                editor.record?.draft || editor.record?.published || null
              }
              seed={
                editor.request?.kind === "new"
                  ? {
                      name: editor.request.payload.name,
                      category: editor.request.payload.category,
                      address: editor.request.payload.address,
                      description: editor.request.payload.description,
                      whatsapp: editor.request.payload.whatsapp,
                    }
                  : undefined
              }
              categories={catalog.data.categories}
              neighborhoods={
                editor.request ? [editor.request.neighborhood] : neighborhoods
              }
              defaultNeighborhood={
                editor.request?.neighborhood || neighborhoods[0]
              }
              onSave={(b) => {
                if (!busy) void saveBusiness(b);
              }}
              onCancel={() => {
                if (!busy) setEditor(null);
              }}
              saveLabel={
                busy
                  ? "Guardando…"
                  : editor.request
                    ? "Aprobar y guardar borrador"
                    : "Guardar borrador"
              }
              uploadPhoto={async (file, neighborhood) => {
                const result = await api<{ assetId: string }>("/admin/photos", {
                  method: "POST",
                  headers: {
                    "Content-Type": file.type,
                    "X-TBC-Neighborhood": neighborhood,
                  },
                  body: file,
                });
                return {
                  ...result,
                  alt:
                    file.name.replace(/\.[^.]+$/, "").slice(0, 120) ||
                    "Foto del comercio",
                };
              }}
            />
            {error && (
              <p role="alert" className="form-error">
                {error}
              </p>
            )}
          </div>
        </Modal>
      )}
      {preview && (
        <Modal
          title="Vista previa de la ficha"
          onClose={() => setPreview(null)}
        >
          <div className="trusted-preview">
            <p className="notice">
              {previewMode === "draft"
                ? "Estás revisando un borrador privado."
                : "Esta es la versión publicada."}
            </p>
            {preview.draft && preview.published && (
              <div
                className="inline-actions preview-switch"
                aria-label="Versiones de vista previa"
              >
                <button
                  className="button button-secondary"
                  aria-pressed={previewMode === "draft"}
                  onClick={() => setPreviewMode("draft")}
                >
                  Borrador
                </button>
                <button
                  className="button button-secondary"
                  aria-pressed={previewMode === "published"}
                  onClick={() => setPreviewMode("published")}
                >
                  Actualmente publicado
                </button>
              </div>
            )}
            <p className="muted">
              Vista de ancho móvil ·{" "}
              {previewMode === "draft" ? "borrador privado" : "versión pública"}
            </p>
            <div className="phone-preview">
              <BusinessPreview
                key={previewMode}
                business={
                  (previewMode === "draft" ? preview.draft : preview.published)!
                }
              />
            </div>
            {preview.draft && previewMode === "draft" && (
              <button
                className="button button-primary"
                disabled={busy}
                onClick={() =>
                  setConfirm({
                    title: "Publicar ficha",
                    description: `La versión de ${preview.draft!.name} que acabás de revisar será visible para todos los usuarios.`,
                    action: async () => {
                      await api(`/admin/businesses/${preview.id}/publish`, {
                        method: "POST",
                        body: JSON.stringify({
                          expectedRevision: preview.revision,
                        }),
                      });
                      setPreview(null);
                    },
                  })
                }
              >
                Publicar esta versión
              </button>
            )}
          </div>
        </Modal>
      )}
      {history && (
        <Modal title="Historial de versiones" onClose={() => setHistory(null)}>
          <div className="trusted-list">
            {history.items.map((h) => (
              <article key={h.id}>
                <div>
                  <strong>
                    Versión {h.revision} ·{" "}
                    {
                      {
                        draft: "Borrador",
                        publish: "Publicación",
                        restore: "Restauración",
                        archive: "Archivo",
                      }[h.action]
                    }
                  </strong>
                  <p>
                    {h.payload.name} ·{" "}
                    {new Date(h.created_at).toLocaleString("es-AR")}
                  </p>
                  <small>Responsable: {h.actor}</small>
                </div>
                <button
                  className="button button-secondary"
                  disabled={busy}
                  onClick={() =>
                    setConfirm({
                      title: "Restaurar como borrador",
                      description:
                        "Se creará una nueva versión privada con estos datos. El catálogo publicado no cambiará.",
                      action: async () => {
                        await api(
                          `/admin/businesses/${history.record.id}/restore`,
                          {
                            method: "POST",
                            body: JSON.stringify({
                              expectedRevision: history.record.revision,
                              historyId: h.id,
                            }),
                          },
                        );
                        setHistory(null);
                      },
                    })
                  }
                >
                  Restaurar como borrador
                </button>
              </article>
            ))}
            <p className="muted">
              Se muestran las últimas 50 versiones. Restaurar conserva el
              historial anterior.
            </p>
          </div>
        </Modal>
      )}
      {review && (
        <Modal
          title={
            review.status === "rejected"
              ? "Rechazar solicitud"
              : "Registrar datos faltantes"
          }
          onClose={() => setReview(null)}
        >
          <form
            className="trusted-editor"
            onSubmit={async (e) => {
              e.preventDefault();
              if (
                await perform(
                  () =>
                    api(`/admin/requests/${review.request.id}/review`, {
                      method: "POST",
                      body: JSON.stringify({
                        expectedRevision: review.request.revision,
                        status: review.status,
                        note: reviewNote,
                      }),
                    }),
                  "Revisión guardada.",
                )
              )
                setReview(null);
            }}
          >
            <label>
              Nota interna de revisión
              <textarea
                required
                minLength={5}
                maxLength={1000}
                rows={4}
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
              />
            </label>
            <p>
              Esta nota queda en la bandeja privada; no se envía al solicitante.
            </p>
            <button className="button button-primary" disabled={busy}>
              Guardar revisión
            </button>
            {error && <p role="alert">{error}</p>}
          </form>
        </Modal>
      )}
      {confirm && (
        <Modal
          title={confirm.title}
          onClose={() => {
            if (!busy) setConfirm(null);
          }}
        >
          <div className="confirm-body">
            <p>{confirm.description}</p>
            <div className="form-actions">
              <button
                className="button button-secondary"
                disabled={busy}
                onClick={() => setConfirm(null)}
              >
                Cancelar
              </button>
              <button
                className="button button-primary"
                disabled={busy}
                onClick={async () => {
                  if (await perform(confirm.action, "Operación completada."))
                    setConfirm(null);
                }}
              >
                {busy ? "Procesando…" : "Confirmar"}
              </button>
            </div>
            {error && (
              <p role="alert" className="form-error">
                {error}
              </p>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
function BusinessPreview({ business: b }: { business: Business }) {
  return (
    <>
      <div className={`detail-art ${b.color}`}>
        <BusinessPhoto business={b} />
      </div>
      <h2>{b.name}</h2>
      <p>
        {b.category} · {b.neighborhood}
      </p>
      <p>{b.description}</p>
      <p>
        {b.address} · GPS: {b.coordinates.lat}, {b.coordinates.lng}
      </p>
      <p>WhatsApp: {b.whatsapp || "Sin cargar"}</p>
      <h3>Horarios semanales</h3>
      {b.hours.length ? (
        b.hours.map((h, i) => (
          <p key={i}>
            {h.days.map((d) => dayNames[d]).join(", ")} · {h.opens} a {h.closes}
          </p>
        ))
      ) : (
        <p>Sin horarios cargados.</p>
      )}
      {b.promotion && <p>Promoción: {b.promotion}</p>}
      <BusinessDetailsView key={b.id} business={b} />
    </>
  );
}
function MetadataForm({
  data,
  busy,
  onSave,
}: {
  data: AppData;
  busy: boolean;
  onSave: (data: AppData) => void;
}) {
  const [draft, setDraft] = useState(data),
    [area, setArea] = useState(""),
    [category, setCategory] = useState(""),
    [error, setError] = useState("");
  return (
    <form
      className="settings-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (!isAppData({ ...draft, businesses: [] })) {
          setError(
            "Revisá nombres, barrios, rubros y WhatsApp. No se admiten valores repetidos.",
          );
          return;
        }
        setError("");
        onSave({ ...draft, businesses: [] });
      }}
    >
      <h2>Identidad y zonas de búsqueda</h2>
      <p>
        Los usuarios solo pueden seleccionar barrios. La creación y eliminación
        se administra desde aquí.
      </p>
      <div className="form-grid">
        {[
          ["appName", "Nombre de la aplicación", 35],
          ["intro", "Presentación", 260],
          ["ownerWhatsapp", "WhatsApp del creador", 25],
        ].map(([key, label, max]) => (
          <label key={key}>
            {label}
            <input
              required={key !== "ownerWhatsapp"}
              maxLength={max as number}
              value={draft.settings[key as keyof typeof draft.settings]}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  settings: { ...draft.settings, [key]: e.target.value },
                })
              }
            />
          </label>
        ))}
        <label>
          Barrio inicial
          <select
            value={draft.settings.neighborhood}
            onChange={(e) =>
              setDraft({
                ...draft,
                settings: { ...draft.settings, neighborhood: e.target.value },
              })
            }
          >
            {draft.neighborhoods?.map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
      </div>
      <fieldset>
        <legend>Barrios</legend>
        <div className="editable-tags">
          {draft.neighborhoods?.map((n) => (
            <span key={n}>
              {n}
              <button
                type="button"
                aria-label={`Quitar barrio ${n}`}
                disabled={n === draft.settings.neighborhood}
                onClick={() =>
                  setDraft({
                    ...draft,
                    neighborhoods: draft.neighborhoods?.filter((x) => x !== n),
                  })
                }
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="inline-actions">
          <label>
            Nuevo barrio
            <input
              maxLength={60}
              value={area}
              onChange={(e) => setArea(e.target.value)}
            />
          </label>
          <button
            type="button"
            className="button button-secondary"
            onClick={() => {
              if (area.trim()) {
                setDraft({
                  ...draft,
                  neighborhoods: [...(draft.neighborhoods || []), area.trim()],
                });
                setArea("");
              }
            }}
          >
            Agregar barrio
          </button>
        </div>
      </fieldset>
      <fieldset>
        <legend>Rubros</legend>
        <div className="editable-tags">
          {draft.categories.map((c) => (
            <span key={c}>
              {c}
              <button
                type="button"
                aria-label={`Quitar rubro ${c}`}
                onClick={() =>
                  setDraft({
                    ...draft,
                    categories: draft.categories.filter((x) => x !== c),
                  })
                }
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="inline-actions">
          <label>
            Nuevo rubro
            <input
              maxLength={50}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
          </label>
          <button
            type="button"
            className="button button-secondary"
            onClick={() => {
              if (category.trim()) {
                setDraft({
                  ...draft,
                  categories: [...draft.categories, category.trim()],
                });
                setCategory("");
              }
            }}
          >
            Agregar rubro
          </button>
        </div>
      </fieldset>
      <p className="muted">
        Antes de quitar un barrio o rubro, reasigná sus comercios y publicá los
        cambios. No se pueden quitar zonas con solicitudes pendientes.
      </p>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <button className="button button-primary" disabled={busy}>
        Revisar configuración
      </button>
    </form>
  );
}
