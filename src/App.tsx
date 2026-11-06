import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ArrowDown,
  ArrowRight,
  Check,
  ChevronDown,
  Compass,
  Download,
  Heart,
  LayoutGrid,
  LocateFixed,
  Map as MapIcon,
  MapPin,
  Menu,
  MessageCircle,
  Navigation,
  Search,
  Settings2,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  Tag,
  X,
  Clock3,
  Coffee,
  Croissant,
  Scissors,
  Shirt,
  Wrench,
  Car,
  ShoppingBasket,
  Flower2,
  Dumbbell,
  Pill,
  PawPrint,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { initialData, dayNames } from "./data";
import {
  STORAGE_KEY,
  directionsUrl,
  distanceKm,
  distanceLabel,
  filterBusinesses,
  isAppData,
  isOpen,
  whatsappUrl,
} from "./domain";
import type { AppData, Business, Coordinates } from "./domain";
import BusinessPhoto from "./BusinessPhoto";
import HeroVisual from "./HeroVisual";
import useExperience from "./useExperience";
import Modal from "./Modal";
import Dashboard from "./Dashboard";
import DownloadCenter from "./DownloadCenter";
import {
  NATIVE_APP,
  ADMIN_DEMO,
  currentPosition,
  locationError,
} from "./platform";
import NeighborhoodPicker from "./NeighborhoodPicker";
import {
  prepareData,
  getNeighborhoods,
  NEIGHBORHOOD_KEY,
  APP_SLOGAN,
} from "./neighborhoods";
import { boundedText, DATA_LIMITS, publicHttpsUrl } from "./securityValidation";
const BusinessMap = lazy(() => import("./BusinessMap"));
const categoryIcons: Record<string, LucideIcon> = {
  Panaderías: Croissant,
  Gastronomía: Coffee,
  "Almacenes y kioscos": ShoppingBasket,
  Moda: Shirt,
  Belleza: Scissors,
  Barberías: Scissors,
  Peluquerías: Scissors,
  "Centros de spa": Flower2,
  "Estética y uñas": Sparkles,
  Gimnasios: Dumbbell,
  Farmacias: Pill,
  Veterinarias: PawPrint,
  "Pet shops": PawPrint,
  Ferreterías: Wrench,
  Automotor: Car,
  Supermercados: ShoppingBag,
};
type View = "explore" | "promos" | "favorites" | "dashboard" | "download";
type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};
function readInitial(): { data: AppData; warning: string } {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (!value) return { data: prepareData(initialData), warning: "" };
    if (value.length > DATA_LIMITS.serializedChars)
      throw new Error("Catálogo local demasiado grande.");
    const parsed: unknown = JSON.parse(value);
    if (isAppData(parsed)) return { data: prepareData(parsed), warning: "" };
    return {
      data: prepareData(initialData),
      warning:
        "Los datos guardados tienen un formato incompatible. Se muestran ejemplos; no se reemplazó tu copia local.",
    };
  } catch {
    return {
      data: prepareData(initialData),
      warning:
        "No pudimos leer el almacenamiento local. Podés explorar la app, pero tus cambios podrían no conservarse.",
    };
  }
}
function loadFavorites(): string[] {
  try {
    const raw = localStorage.getItem("budge-cerca:favorites") || "[]";
    if (raw.length > DATA_LIMITS.serializedChars) return [];
    const v: unknown = JSON.parse(raw);
    return Array.isArray(v) &&
      v.length <= DATA_LIMITS.favorites &&
      v.every((x) => boundedText(x, 1, DATA_LIMITS.businessId))
      ? [...new Set(v)]
      : [];
  } catch {
    return [];
  }
}
export default function App() {
  useExperience();
  const [initial] = useState(readInitial);
  const [data, setData] = useState(initial.data);
  const [warning, setWarning] = useState(initial.warning);
  const [view, setView] = useState<View>(
    location.pathname.replace(/\/$/, "") === "/descargar"
      ? "download"
      : "explore",
  );
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Todos");
  const [openOnly, setOpenOnly] = useState(false);
  const [mapMode, setMapMode] = useState(false);
  const [origin, setOrigin] = useState<Coordinates | null>(null);
  const [locating, setLocating] = useState(false);
  const [gpsMessage, setGpsMessage] = useState("");
  const [favorites, setFavorites] = useState<string[]>(loadFavorites);
  const [selected, setSelected] = useState<Business | null>(null);
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [toast, setToast] = useState("");
  const resultsRef = useRef<HTMLElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const { settings, businesses, categories } = data;
  const neighborhoods = getNeighborhoods(data);
  const [selectedNeighborhood, setSelectedNeighborhood] = useState(() => {
    try {
      const saved = localStorage.getItem(NEIGHBORHOOD_KEY);
      if (saved && getNeighborhoods(initial.data).includes(saved)) return saved;
    } catch {
      /* Selection remains usable in this session. */
    }
    return initial.data.settings.neighborhood;
  });
  const previousHome = useRef(settings.neighborhood);
  useEffect(() => {
    if (
      previousHome.current !== settings.neighborhood ||
      !getNeighborhoods(data).includes(selectedNeighborhood)
    ) {
      previousHome.current = settings.neighborhood;
      setSelectedNeighborhood(settings.neighborhood);
    }
  }, [data, settings.neighborhood, selectedNeighborhood]);
  useEffect(() => {
    try {
      localStorage.setItem(NEIGHBORHOOD_KEY, selectedNeighborhood);
    } catch {
      /* No location is inferred or sent. */
    }
  }, [selectedNeighborhood]);
  const neighborhoodBusinesses = useMemo(
    () => businesses.filter((b) => b.neighborhood === selectedNeighborhood),
    [businesses, selectedNeighborhood],
  );
  const quickCategories = [
    "Barberías",
    "Centros de spa",
    "Peluquerías",
    "Panaderías",
    "Gastronomía",
    "Moda",
    "Almacenes y kioscos",
  ].filter((c) => categories.includes(c));
  function chooseNeighborhood(name: string) {
    setSelectedNeighborhood(name);
    setSelected(null);
    setQuery("");
    setCategory("Todos");
    setOpenOnly(false);
  }
  const ownerUrl = whatsappUrl(
    settings.ownerWhatsapp,
    `¡Hola! Quiero saber más sobre ${settings.appName} en ${selectedNeighborhood}.`,
  );
  const results = useMemo(
    () =>
      filterBusinesses(businesses, query, category, {
        promotions: view === "promos",
        favorites,
        onlyFavorites: view === "favorites",
        open: openOnly,
        origin,
        neighborhood: selectedNeighborhood,
      }),
    [
      businesses,
      query,
      category,
      view,
      favorites,
      openOnly,
      origin,
      selectedNeighborhood,
    ],
  );
  const featured = neighborhoodBusinesses.filter((b) => b.featured).slice(0, 3);
  useEffect(() => {
    document.title = `${settings.appName} · ${selectedNeighborhood}`;
    const el = document.querySelector('link[rel="manifest"]');
    const manifest = {
      id: "/",
      name: `${settings.appName} · ${selectedNeighborhood}`,
      short_name: settings.appName.slice(0, 24),
      lang: "es-AR",
      start_url: location.origin + "/",
      scope: location.origin + "/",
      display: "standalone",
      theme_color: "#081426",
      background_color: "#081426",
      icons: [192, 512].map((size) => ({
        src: `${location.origin}/icon-${size}.png`,
        sizes: `${size}x${size}`,
        type: "image/png",
        purpose: size === 512 ? "any maskable" : "any",
      })),
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(manifest)], {
        type: "application/manifest+json",
      }),
    );
    el?.setAttribute("href", url);
    return () => URL.revokeObjectURL(url);
  }, [settings.appName, selectedNeighborhood]);
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as InstallEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    const installed = () => {
      setInstallEvent(null);
      setToast("La app ya está instalada. ¡Nos vemos en el barrio!");
    };
    window.addEventListener("appinstalled", installed);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installed);
    };
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(timer);
  }, [toast]);
  function saveData(value: AppData) {
    if (!ADMIN_DEMO || !isAppData(value)) {
      setWarning(
        "No se guardaron los cambios: los datos no son válidos o la administración no está habilitada.",
      );
      return;
    }
    const next = prepareData(value);
    const nextNeighborhood =
      next.settings.neighborhood !== data.settings.neighborhood ||
      !getNeighborhoods(next).includes(selectedNeighborhood)
        ? next.settings.neighborhood
        : selectedNeighborhood;
    setData(next);
    setSelectedNeighborhood(nextNeighborhood);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      localStorage.setItem(NEIGHBORHOOD_KEY, nextNeighborhood);
      setWarning("");
      setToast("Cambios guardados en este dispositivo");
    } catch {
      setWarning(
        "No se pudieron guardar los cambios. Siguen disponibles en esta sesión; exportá una copia desde el dashboard antes de cerrar.",
      );
    }
  }
  function favorite(id: string) {
    const available = new Set(businesses.map((business) => business.id));
    if (!available.has(id)) return;
    const current = favorites.filter((favoriteId) => available.has(favoriteId));
    const next = current.includes(id)
      ? current.filter((x) => x !== id)
      : [...current, id];
    if (next.length > DATA_LIMITS.favorites) {
      setToast(
        "Alcanzaste el límite de favoritos. Quitá uno para guardar otro.",
      );
      return;
    }
    setFavorites(next);
    try {
      localStorage.setItem("budge-cerca:favorites", JSON.stringify(next));
    } catch {
      setToast("El favorito se conserva solo durante esta sesión.");
    }
  }
  function changeView(next: View) {
    if (!ADMIN_DEMO && next === "dashboard") return;
    if (!NATIVE_APP)
      history.replaceState(null, "", next === "download" ? "/descargar" : "/");
    setView(next);
    setCategory("Todos");
    setQuery("");
    setOpenOnly(false);
    setMobileMenu(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function locate() {
    setLocating(true);
    setGpsMessage("");
    try {
      const position = await currentPosition();
      setOrigin(position);
      setGpsMessage(
        "Ubicación activada. Ordenamos los comercios por cercanía. Las distancias son en línea recta.",
      );
    } catch (error) {
      setGpsMessage(locationError(error));
    } finally {
      setLocating(false);
    }
  }
  async function install() {
    changeView("download");
  }
  async function promptInstall() {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
  }
  useEffect(() => {
    if (!NATIVE_APP) return;
    const external = async (e: MouseEvent) => {
      const a = (e.target as Element)?.closest?.(
        'a[target="_blank"]',
      ) as HTMLAnchorElement | null;
      if (!a) return;
      e.preventDefault();
      if (!publicHttpsUrl(a.href)) {
        setToast("Ese enlace no está permitido.");
        return;
      }
      try {
        const { Browser } = await import("@capacitor/browser");
        await Browser.open({ url: a.href });
      } catch {
        setToast("No pudimos abrir ese enlace. Volvé a intentarlo.");
      }
    };
    document.addEventListener("click", external);
    return () => document.removeEventListener("click", external);
  }, []);
  useEffect(() => {
    if (!NATIVE_APP) return;
    let removed = false;
    const handle = import("@capacitor/app").then(async ({ App: Native }) => {
      const listener = await Native.addListener("backButton", () => {
        if (selected) setSelected(null);
        else if (mobileMenu) setMobileMenu(false);
        else if (view !== "explore") changeView("explore");
        else void Native.exitApp();
      });
      if (removed) await listener.remove();
      return listener;
    });
    return () => {
      removed = true;
      void handle.then((h) => h.remove());
    };
  }, [selected, mobileMenu, view]);
  const selectBusiness = useCallback((b: Business) => setSelected(b), []);
  function scrollResults() {
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function renderCard(b: Business, featuredCard = false) {
    const Icon = Object.hasOwn(categoryIcons, b.category)
      ? categoryIcons[b.category]
      : Store;
    const open = isOpen(b);
    return (
      <article
        className={`business-card ${featuredCard ? "featured-card" : ""}`}
        onPointerMove={(e) => {
          if (e.pointerType === "touch") return;
          const r = e.currentTarget.getBoundingClientRect();
          e.currentTarget.style.setProperty(
            "--tilt-x",
            `${((e.clientY - r.top) / r.height - 0.5) * -5}deg`,
          );
          e.currentTarget.style.setProperty(
            "--tilt-y",
            `${((e.clientX - r.left) / r.width - 0.5) * 6}deg`,
          );
          e.currentTarget.style.setProperty(
            "--pointer-x",
            `${((e.clientX - r.left) / r.width) * 100}%`,
          );
          e.currentTarget.style.setProperty(
            "--pointer-y",
            `${((e.clientY - r.top) / r.height) * 100}%`,
          );
        }}
        onPointerLeave={(e) => {
          e.currentTarget.style.setProperty("--tilt-x", "0deg");
          e.currentTarget.style.setProperty("--tilt-y", "0deg");
        }}
        key={b.id}
      >
        <div className={`card-cover ${b.color}`}>
          <button
            className="art-button"
            onClick={() => setSelected(b)}
            aria-label={`Ver ${b.name}`}
          >
            <BusinessPhoto business={b} />
          </button>
          <span className="cover-badge">
            {featuredCard ? (
              <>
                <Sparkles size={12} /> Destacado
              </>
            ) : (
              <>
                <Icon size={12} /> {b.category}
              </>
            )}
          </span>
          <button
            className={`favorite-button ${
              favorites.includes(b.id) ? "active" : ""
            }`}
            aria-label={`${favorites.includes(b.id) ? "Quitar" : "Guardar"} ${
              b.name
            } en favoritos`}
            aria-pressed={favorites.includes(b.id)}
            onClick={() => favorite(b.id)}
          >
            <Heart
              size={17}
              fill={favorites.includes(b.id) ? "currentColor" : "none"}
            />
          </button>
        </div>
        <div className="card-body">
          <div className="card-category">
            {b.category}
            <span className={`status-dot ${open ? "open" : ""}`} />
            <span className={`open-status ${open ? "open" : ""}`}>
              {!b.hours.length ? "Sin horarios" : open ? "Abierto" : "Cerrado"}
            </span>
          </div>
          <button className="card-title" onClick={() => setSelected(b)}>
            {b.name}
            <ArrowRight size={19} />
          </button>
          <p className="card-description">{b.description}</p>
          <p className="card-address">
            <MapPin size={14} />
            {b.address}
          </p>
          <div className="card-footer">
            {b.promotion ? (
              <button className="promotion-link" onClick={() => setSelected(b)}>
                <Tag size={13} /> Hay una promo para vos
              </button>
            ) : (
              <span className="local-label">
                <Store size={13} /> Comercio del barrio
              </span>
            )}
            {origin && (
              <span className="distance">
                <Navigation size={12} />
                {distanceLabel(distanceKm(origin, b.coordinates))}
              </span>
            )}
          </div>
        </div>
      </article>
    );
  }
  return (
    <>
      <div className="scroll-progress" aria-hidden="true" />
      <div className="ambient-light" aria-hidden="true" />
      <div className="announcement">
        <span>Hecho para encontrarnos. Pensado para el barrio.</span>
        <span className="demo-label">
          Demo · locales e imágenes ilustrativas
        </span>
      </div>
      <header className="site-header">
        <div className="header-inner">
          <button
            className="brand"
            onClick={() => changeView("explore")}
            aria-label="Ir al inicio"
          >
            <span className="brand-icon">
              <MapPin size={25} strokeWidth={2.1} />
              <span />
            </span>
            <span>
              {settings.appName}
              <small>GUÍA DE COMERCIOS</small>
            </span>
          </button>
          <nav className="desktop-nav" aria-label="Navegación principal">
            <button
              className={view === "explore" ? "active" : ""}
              onClick={() => changeView("explore")}
            >
              Explorar
            </button>
            <button
              className={view === "promos" ? "active" : ""}
              onClick={() => changeView("promos")}
            >
              Promociones
              <span className="tiny-dot" />
            </button>
            <button
              className={view === "favorites" ? "active" : ""}
              onClick={() => changeView("favorites")}
            >
              Mis favoritos
            </button>
          </nav>
          <div className="header-actions">
            {ADMIN_DEMO && (
              <button
                className={`dashboard-link ${
                  view === "dashboard" ? "active" : ""
                }`}
                onClick={() => changeView("dashboard")}
              >
                <Settings2 size={16} />
                <span>Dashboard demo</span>
              </button>
            )}
            {ADMIN_DEMO && <span className="header-divider" />}
            <a
              className={`button button-primary header-contact ${
                !ownerUrl ? "disabled" : ""
              }`}
              href={ownerUrl || undefined}
              target="_blank"
              rel="noopener noreferrer"
              aria-disabled={!ownerUrl}
            >
              <MessageCircle size={16} />
              Contactanos
            </a>
            <button
              className="icon-button mobile-menu-toggle"
              aria-label={mobileMenu ? "Cerrar menú" : "Abrir menú"}
              aria-expanded={mobileMenu}
              onClick={() => setMobileMenu(!mobileMenu)}
            >
              {mobileMenu ? <X /> : <Menu />}
            </button>
          </div>
        </div>
        {mobileMenu && (
          <nav className="mobile-menu" aria-label="Menú móvil">
            <button onClick={() => changeView("explore")}>Explorar</button>
            <button onClick={() => changeView("promos")}>Promociones</button>
            <button onClick={() => changeView("favorites")}>
              Mis favoritos
            </button>
            {ADMIN_DEMO && (
              <button onClick={() => changeView("dashboard")}>
                Dashboard demo
              </button>
            )}
            <button onClick={install}>Instalar aplicación</button>
          </nav>
        )}
      </header>
      {warning && (
        <div className="notice warning" role="alert">
          {warning}
        </div>
      )}
      {view === "download" ? (
        <DownloadCenter
          canInstall={Boolean(installEvent)}
          onInstall={promptInstall}
          onExplore={() => changeView("explore")}
        />
      ) : ADMIN_DEMO && view === "dashboard" ? (
        <main className="container dashboard-main">
          <Dashboard
            data={data}
            onChange={saveData}
            defaultNeighborhood={selectedNeighborhood}
          />
        </main>
      ) : (
        <main>
          <NeighborhoodPicker
            neighborhoods={neighborhoods}
            selected={selectedNeighborhood}
            onSelect={chooseNeighborhood}
          />
          {view === "explore" ? (
            <section className="hero container">
              <div className="hero-copy">
                <span className="location-pill">
                  <span className="pulse-dot" />
                  <MapPin size={13} />
                  {selectedNeighborhood}
                  <ChevronDown size={12} />
                </span>
                <span className="hero-kicker">
                  CERCA DE TODO. LEJOS DE LO COMÚN.
                </span>
                <h1 aria-label={APP_SLOGAN}>
                  Conectá con
                  <br />
                  lo que <span className="hero-word">te rodea.</span>
                </h1>
                <p>{settings.intro}</p>
                <form
                  className="hero-search"
                  onSubmit={(e) => {
                    e.preventDefault();
                    scrollResults();
                  }}
                >
                  <Search size={21} />
                  <input
                    ref={searchRef}
                    aria-label="Buscar comercios"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="¿Qué estás buscando hoy?"
                  />
                  <button type="submit">
                    Buscar
                    <ArrowRight size={17} />
                  </button>
                </form>
                <button className="hero-download-link" onClick={install}>
                  <Download size={17} />
                  Llevá el barrio en tu celular
                  <ArrowRight size={16} />
                </button>
                <div className="hero-footnote">
                  <span>
                    <Check size={14} /> Comercios locales
                  </span>
                  <span>
                    <Check size={14} /> Contacto directo
                  </span>
                  <span>
                    <Check size={14} /> Sin vueltas
                  </span>
                </div>
              </div>
              <HeroVisual
                businesses={neighborhoodBusinesses}
                neighborhood={selectedNeighborhood}
                onSelect={selectBusiness}
              />
              <div className="hero-scroll">
                <button onClick={scrollResults}>
                  <span className="scroll-mouse">
                    <ArrowDown size={15} />
                  </span>
                  Deslizá. Tu próxima parada está acá.
                </button>
                <span>
                  <strong>
                    {neighborhoodBusinesses.length.toString().padStart(2, "0")}
                  </strong>{" "}
                  comercios por descubrir <ArrowRight size={17} />
                </span>
              </div>
            </section>
          ) : (
            <section className="container page-intro">
              <span className="eyebrow">
                {view === "promos"
                  ? "MÁS BARRIO, MÁS BENEFICIOS"
                  : "TUS LUGARES DE SIEMPRE"}
              </span>
              <h1>
                {view === "promos"
                  ? "Pequeños gustos. Grandes promos."
                  : "Lo bueno, guardado."}
              </h1>
              <p>
                {view === "promos"
                  ? "Descubrí lo que prepararon los comercios para vos. Consultá las condiciones directamente con cada local."
                  : "Guardá tus comercios preferidos con el corazón y encontralos siempre acá, en este dispositivo."}
              </p>
              <div className="subpage-search">
                <Search size={20} />
                <input
                  aria-label="Buscar comercios"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar por nombre, rubro o dirección"
                />
              </div>
            </section>
          )}
          <div className="neighborhood-marquee" aria-hidden="true">
            <div>
              {[0, 1].map((i) => (
                <span key={i}>
                  COMPRÁ LOCAL <Sparkles /> DESCUBRÍ MÁS <Sparkles /> CONECTÁ
                  CON TU BARRIO <Sparkles /> DESCUBRÍ LO LOCAL <Sparkles />{" "}
                </span>
              ))}
            </div>
          </div>
          <section className="categories-section container" data-reveal>
            <div className="section-topline">
              <h2>¿Qué necesitás encontrar?</h2>
              <span>
                Elegí un rubro y descubrí el barrio <ArrowDown size={13} />
              </span>
            </div>
            <div className="category-list">
              <button
                className={`category-item ${
                  category === "Todos" ? "selected" : ""
                }`}
                onClick={() => {
                  setCategory("Todos");
                  scrollResults();
                }}
              >
                <span>
                  <LayoutGrid size={22} />
                </span>
                Todos los rubros
              </button>
              {quickCategories.map((c) => {
                const Icon = Object.hasOwn(categoryIcons, c)
                  ? categoryIcons[c]
                  : Store;
                return (
                  <button
                    key={c}
                    className={`category-item ${
                      category === c ? "selected" : ""
                    }`}
                    onClick={() => {
                      setCategory(c);
                      scrollResults();
                    }}
                  >
                    <span>
                      <Icon size={22} />
                    </span>
                    {c}
                  </button>
                );
              })}
            </div>
          </section>
          {view === "explore" &&
            !query &&
            category === "Todos" &&
            featured.length > 0 && (
              <section className="featured-section container" data-reveal>
                <div className="section-heading">
                  <div>
                    <span className="eyebrow">
                      <Sparkles size={13} /> 01 / SPOTS DEL BARRIO
                    </span>
                    <h2>
                      Acá pasan cosas buenas<span>.</span>
                    </h2>
                  </div>
                  <button className="text-link" onClick={scrollResults}>
                    Ver todos los comercios
                    <ArrowRight size={16} />
                  </button>
                </div>
                <div className="business-grid featured-grid">
                  {featured.map((b) => renderCard(b, true))}
                </div>
              </section>
            )}
          <section
            className="results-section container"
            ref={resultsRef}
            data-reveal
          >
            <div className="section-heading">
              <div>
                <span className="eyebrow">02 / TU PRÓXIMA PARADA</span>
                <h2>
                  {view === "promos"
                    ? "Promociones del barrio"
                    : view === "favorites"
                      ? "Tus comercios favoritos"
                      : "Encontrá tu próximo lugar"}
                  <span>.</span>
                </h2>
                <p className="result-count" aria-live="polite">
                  {results.length}{" "}
                  {results.length === 1
                    ? "comercio encontrado"
                    : "comercios encontrados"}
                  {query ? ` para “${query}”` : ` en ${selectedNeighborhood}`}
                </p>
              </div>
              <div
                className="view-toggle"
                role="group"
                aria-label="Vista de resultados"
              >
                <button
                  className={!mapMode ? "active" : ""}
                  aria-pressed={!mapMode}
                  onClick={() => setMapMode(false)}
                >
                  <LayoutGrid size={15} />
                  Lista
                </button>
                <button
                  className={mapMode ? "active" : ""}
                  aria-pressed={mapMode}
                  onClick={() => setMapMode(true)}
                >
                  <MapIcon size={15} />
                  Mapa
                </button>
              </div>
            </div>
            <div className="filter-bar">
              <div className="filter-left">
                <label className="select-wrap">
                  <span className="sr-only">Filtrar por rubro</span>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="Todos">Todos los rubros</option>
                    {categories.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} />
                </label>
                <button
                  className={`filter-chip ${openOnly ? "active" : ""}`}
                  aria-pressed={openOnly}
                  onClick={() => setOpenOnly(!openOnly)}
                >
                  <span className="status-dot open" />
                  Abiertos ahora
                </button>
                {(query || category !== "Todos" || openOnly) && (
                  <button
                    className="clear-filters"
                    onClick={() => {
                      setQuery("");
                      setCategory("Todos");
                      setOpenOnly(false);
                    }}
                  >
                    Limpiar
                    <X size={12} />
                  </button>
                )}
              </div>
              <button
                className={`location-button ${origin ? "active" : ""}`}
                onClick={locate}
                disabled={locating}
              >
                <LocateFixed size={16} />
                {locating
                  ? "Buscando ubicación…"
                  : origin
                    ? "Actualizar mi ubicación"
                    : "Usar mi ubicación"}
              </button>
            </div>
            {gpsMessage && (
              <p className="gps-message" role="status">
                <MapPin size={15} />
                {gpsMessage}
                {origin && (
                  <button
                    onClick={() => {
                      setOrigin(null);
                      setGpsMessage("Ubicación desactivada.");
                    }}
                  >
                    Desactivar
                  </button>
                )}
              </p>
            )}
            {results.length === 0 ? (
              <div className="empty-state">
                <Search size={35} />
                {neighborhoodBusinesses.length === 0 && (
                  <p className="empty-neighborhood">
                    Todavía no hay comercios cargados en {selectedNeighborhood}.
                    Elegí otro barrio o volvé pronto para descubrir novedades.
                  </p>
                )}
                <h3>
                  {view === "favorites" &&
                  !query &&
                  category === "Todos" &&
                  !openOnly
                    ? "Tu próxima parada favorita te está esperando"
                    : "No encontramos comercios con estos filtros"}
                </h3>
                <p>
                  {view === "favorites"
                    ? "Tocá el corazón de un comercio para guardarlo, o probá con otros filtros."
                    : "Probá con otro nombre o explorá todos los rubros del barrio."}
                </p>
                <button
                  className="button button-primary"
                  onClick={() => {
                    changeView("explore");
                    searchRef.current?.focus();
                  }}
                >
                  Explorar comercios
                  <ArrowRight size={16} />
                </button>
              </div>
            ) : mapMode ? (
              <Suspense
                fallback={
                  <div className="empty-state">Preparando el mapa…</div>
                }
              >
                <BusinessMap
                  businesses={results}
                  origin={origin}
                  onSelect={selectBusiness}
                />
              </Suspense>
            ) : (
              <div className="business-grid">
                {results.map((b) => renderCard(b))}
              </div>
            )}
          </section>
          <section className="join-section container" data-reveal>
            <div className="join-icon">
              <Store size={33} />
            </div>
            <div>
              <span className="eyebrow">CREZCAMOS JUNTOS</span>
              <h2>Tu negocio también es parte del barrio.</h2>
              <p>
                Sumate a {settings.appName} y conectá con tus próximos clientes.
              </p>
            </div>
            <a
              href={ownerUrl || undefined}
              aria-disabled={!ownerUrl}
              className={`button button-primary ${!ownerUrl ? "disabled" : ""}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Quiero sumar mi comercio
              <ArrowRight size={17} />
            </a>
          </section>
          <section className="values-strip container">
            <span>
              <ShieldCheck />
              Contacto directo, sin intermediarios
            </span>
            <span>
              <Heart />
              Apoyamos al comercio local
            </span>
            <span>
              <Compass />
              Tu barrio, en un solo lugar
            </span>
          </section>
        </main>
      )}
      <footer className="site-footer">
        <div className="container footer-inner">
          <div>
            <span className="footer-brand">
              <MapPin size={20} />
              {settings.appName}
            </span>
            <p>Hecho cerca. Hecho para vos.</p>
          </div>
          <span className="footer-location">
            <MapPin size={13} />
            {selectedNeighborhood} · Argentina
          </span>
          <button onClick={install}>
            <Download size={15} />
            Llevá el barrio en tu celular
            <ArrowRight size={14} />
          </button>
        </div>
        <div className="container footer-bottom">
          <span>
            Prototipo · Datos de ejemplo y cambios guardados solo en este
            navegador.
          </span>
          {ADMIN_DEMO && (
            <button onClick={() => changeView("dashboard")}>
              Administrar demo
              <ArrowRight size={12} />
            </button>
          )}
        </div>
      </footer>
      <nav className="mobile-bottom-nav" aria-label="Accesos móviles">
        <button
          className={view === "explore" ? "active" : ""}
          onClick={() => changeView("explore")}
        >
          <Compass size={21} />
          <span>Explorar</span>
        </button>
        <button
          className={view === "promos" ? "active" : ""}
          onClick={() => changeView("promos")}
        >
          <Tag size={21} />
          <span>Promos</span>
        </button>
        <button
          className={view === "favorites" ? "active" : ""}
          onClick={() => changeView("favorites")}
        >
          <Heart size={21} />
          <span>Favoritos</span>
        </button>
        <button onClick={install}>
          <Download size={21} />
          <span>{NATIVE_APP ? "Compartir" : "Descargar"}</span>
        </button>
      </nav>
      {selected && (
        <Modal title={selected.name} onClose={() => setSelected(null)}>
          <div className={`detail-art ${selected.color}`}>
            <BusinessPhoto business={selected} priority />
          </div>
          <div className="detail-body">
            <div className="detail-tags">
              <span className="tag">{selected.category}</span>
              <span
                className={`status-label ${isOpen(selected) ? "open" : ""}`}
              >
                <span
                  className={`status-dot ${isOpen(selected) ? "open" : ""}`}
                />
                {!selected.hours.length
                  ? "Consultar horarios"
                  : isOpen(selected)
                    ? "Abierto ahora"
                    : "Cerrado ahora"}
              </span>
              <button
                className={`icon-button ${
                  favorites.includes(selected.id) ? "is-favorite" : ""
                }`}
                aria-label="Guardar en favoritos"
                aria-pressed={favorites.includes(selected.id)}
                onClick={() => favorite(selected.id)}
              >
                <Heart
                  size={20}
                  fill={
                    favorites.includes(selected.id) ? "currentColor" : "none"
                  }
                />
              </button>
            </div>
            <p className="detail-description">{selected.description}</p>
            <div className="detail-info">
              <MapPin size={19} />
              <div>
                <strong>Encontranos en</strong>
                <p>
                  {selected.address},{" "}
                  {selected.neighborhood || selectedNeighborhood}
                </p>
                {origin && (
                  <small>
                    A {distanceLabel(distanceKm(origin, selected.coordinates))}{" "}
                    en línea recta desde tu ubicación
                  </small>
                )}
              </div>
            </div>
            <div className="detail-info">
              <Clock3 size={19} />
              <div>
                <strong>Horarios de atención</strong>
                {selected.hours.length ? (
                  selected.hours.map((h, i) => (
                    <p key={i}>
                      {h.days.map((d) => dayNames[d]).join(", ")} · {h.opens} a{" "}
                      {h.closes}
                      {h.closes < h.opens ? " (día siguiente)" : ""}
                    </p>
                  ))
                ) : (
                  <p>Consultá los horarios al comercio.</p>
                )}
                <small>Hora de Argentina · Pueden variar en feriados.</small>
              </div>
            </div>
            <div className="detail-info">
              <MessageCircle size={19} />
              <div>
                <strong>WhatsApp</strong>
                <p>
                  {selected.whatsapp ||
                    "Este comercio todavía no cargó su número."}
                </p>
              </div>
            </div>
            {selected.promotion && (
              <div className="detail-promotion">
                <Tag size={21} />
                <div>
                  <strong>Una promo para aprovechar</strong>
                  <p>{selected.promotion}</p>
                  <small>
                    Consultá vigencia, disponibilidad y condiciones con el
                    comercio.
                  </small>
                </div>
              </div>
            )}
            <div className="detail-actions">
              <a
                className="button button-primary"
                href={directionsUrl(selected, origin)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Navigation size={17} />
                Cómo llegar
              </a>
              <a
                className={`button button-secondary ${
                  !whatsappUrl(selected.whatsapp, "") ? "disabled" : ""
                }`}
                href={
                  whatsappUrl(
                    selected.whatsapp,
                    `¡Hola! Te encontré en ${settings.appName}. Quisiera hacer una consulta.`,
                  ) || undefined
                }
                aria-disabled={!whatsappUrl(selected.whatsapp, "")}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle size={17} />
                WhatsApp
              </a>
            </div>
            <p className="detail-disclaimer">
              Demo: verificá los datos y la ubicación antes de visitar un local.
              Las imágenes iniciales son ilustrativas. Los recorridos se abren
              en Google Maps.
            </p>
          </div>
        </Modal>
      )}
      {ownerUrl && (
        <a
          className="contact-float"
          href={ownerUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Contactar al creador por WhatsApp"
        >
          <MessageCircle size={24} />
        </a>
      )}
      {toast && (
        <div className="toast" role="status">
          <Check size={17} />
          {toast}
        </div>
      )}
    </>
  );
}
