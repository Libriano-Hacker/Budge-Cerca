import { useState } from "react";
import {
  ArrowRight,
  Check,
  Copy,
  Download,
  MapPin,
  QrCode,
  Smartphone,
  Globe,
  ShieldCheck,
} from "lucide-react";
import { DOWNLOAD_URL, downloads } from "./distribution";
import { NATIVE_APP } from "./platform";

export default function DownloadCenter({
  canInstall,
  onInstall,
  onExplore,
}: {
  canInstall: boolean;
  onInstall: () => Promise<void>;
  onExplore: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(DOWNLOAD_URL);
      setCopied(true);
      setCopyError(false);
    } catch {
      setCopyError(true);
    }
  }
  return (
    <main className="download-center container">
      <span className="eyebrow">
        <Smartphone size={15} /> TU BARRIO TE ACOMPAÑA
      </span>
      <h1>
        Todo tu barrio.
        <br />
        <span>En tu bolsillo.</span>
      </h1>
      <p className="download-intro">
        Comercios, promociones y favoritos. Llevá Tu Barrio Cerca con vos, en
        Android o iPhone.
      </p>
      <div className="download-layout">
        <div className="download-options">
          <section className="download-option available">
            <span className="download-option-icon">
              <Globe size={27} />
            </span>
            <div>
              <span className="availability">INSTALACIÓN WEB</span>
              <h2>La app desde tu navegador</h2>
              <p>
                Agregala a la pantalla de inicio y abrila desde el ícono de tu
                celular. Tus comercios favoritos, siempre a mano.
              </p>
              {canInstall && !NATIVE_APP ? (
                <button className="button button-primary" onClick={onInstall}>
                  <Download size={17} />
                  Instalar en este dispositivo
                </button>
              ) : (
                <a className="button button-primary" href="#installation-steps">
                  <Smartphone size={17} />
                  Ver cómo instalar
                </a>
              )}
            </div>
          </section>
          <section className="download-option">
            <span className="download-option-icon">
              <Smartphone size={27} />
            </span>
            <div>
              <span className="availability pending">
                {downloads.google || downloads.apk
                  ? "ANDROID"
                  : "VERSIÓN NATIVA EN PREPARACIÓN"}
              </span>
              <h2>Android</h2>
              <p>
                {downloads.google || downloads.apk
                  ? "Descargala en tu celular para encontrar comercios, guardar favoritos y descubrir promociones."
                  : "Estamos preparando la versión de Android. Mientras tanto podés agregar la app a tu pantalla de inicio desde Chrome."}
              </p>
              {downloads.google && (
                <a
                  className="button button-secondary"
                  href={downloads.google}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Abrir Google Play
                  <ArrowRight size={16} />
                </a>
              )}
              {downloads.apk && (
                <a className="button button-secondary" href={downloads.apk}>
                  Descargar APK
                  <Download size={16} />
                </a>
              )}
              {!downloads.google && !downloads.apk && (
                <span className="store-pending">
                  Todavía sin descarga nativa pública
                </span>
              )}
            </div>
          </section>
          <section className="download-option">
            <span className="download-option-icon">
              <Smartphone size={27} />
            </span>
            <div>
              <span className="availability pending">
                {downloads.apple ? "IPHONE" : "VERSIÓN NATIVA EN PREPARACIÓN"}
              </span>
              <h2>iPhone</h2>
              <p>
                {downloads.apple
                  ? "Descubrí tu barrio desde tu iPhone. Descargá la app desde App Store."
                  : "Estamos preparando la versión de iPhone. Mientras tanto podés agregar la app a tu pantalla de inicio desde Safari."}
              </p>
              {downloads.apple ? (
                <a
                  className="button button-secondary"
                  href={downloads.apple}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Abrir App Store
                  <ArrowRight size={16} />
                </a>
              ) : (
                <span className="store-pending">
                  App Store / TestFlight pendientes
                </span>
              )}
            </div>
          </section>
        </div>
        <aside className="qr-panel">
          <span className="eyebrow">
            <QrCode size={15} /> UN QR, DOS PLATAFORMAS
          </span>
          <h2>Escaneá y llevátela.</h2>
          <div className="qr-frame">
            <img
              src="/descargas/tu-barrio-cerca-qr.png"
              width="256"
              height="256"
              alt={`Código QR para abrir ${DOWNLOAD_URL}`}
            />
          </div>
          <p>
            Este QR abre esta página de instalación. No instala la app
            automáticamente.
          </p>
          {!NATIVE_APP && (
            <a
              className="button button-secondary"
              download="tu-barrio-cerca-qr.png"
              href="/descargas/tu-barrio-cerca-qr.png"
            >
              <Download size={16} />
              Descargar QR
            </a>
          )}
          <button className="button button-ghost" onClick={copy}>
            {copied ? <Check size={16} /> : <Copy size={16} />}{" "}
            {copied ? "Enlace copiado" : "Copiar enlace"}
          </button>
          <small className="qr-target">{DOWNLOAD_URL}</small>
          {copyError && (
            <p role="status">Copiá manualmente el enlace que aparece arriba.</p>
          )}
          {!downloads.google && !downloads.apple && !downloads.apk && (
            <div className="qr-activation">
              <ShieldCheck size={17} />
              <span>
                QR de vista previa. Las descargas nativas todavía no están
                disponibles.
              </span>
            </div>
          )}
        </aside>
      </div>
      <section className="installation-steps" id="installation-steps">
        <span className="eyebrow">SIN PASOS COMPLICADOS</span>
        <h2>Instalala en tu pantalla de inicio.</h2>
        <div className="installation-grid">
          <article>
            <span>01 / ANDROID</span>
            <h3>Desde Chrome</h3>
            <ol>
              <li>Abrí el enlace público de Tu Barrio Cerca.</li>
              <li>
                En el menú ⋮, elegí «Instalar aplicación» o «Agregar a pantalla
                principal».
              </li>
              <li>Confirmá y abrila desde el nuevo ícono.</li>
            </ol>
          </article>
          <article>
            <span>02 / IPHONE</span>
            <h3>Desde Safari</h3>
            <ol>
              <li>Abrí el enlace público de Tu Barrio Cerca.</li>
              <li>Tocá Compartir y buscá «Agregar a pantalla de inicio».</li>
              <li>Confirmá «Agregar» y abrila desde el ícono.</li>
            </ol>
          </article>
        </div>
        <p className="muted">
          Esta versión usa comercios de ejemplo. Los favoritos y cambios se
          guardan solamente en este dispositivo.
        </p>
        <button className="button button-primary" onClick={onExplore}>
          <MapPin size={17} />
          Explorar comercios
          <ArrowRight size={17} />
        </button>
      </section>
    </main>
  );
}
