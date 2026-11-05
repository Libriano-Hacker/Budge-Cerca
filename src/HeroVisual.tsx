import { useState } from "react";
import {
  ArrowUpRight,
  MapPin,
  Pause,
  Play,
  Sparkles,
  Box,
  Camera,
} from "lucide-react";
import type { Business } from "./domain";
import BusinessPhoto from "./BusinessPhoto";
import Scene from "./HeroScene";

export default function HeroVisual({
  businesses,
  neighborhood,
  onSelect,
}: {
  businesses: Business[];
  neighborhood: string;
  onSelect: (business: Business) => void;
}) {
  const [paused, setPaused] = useState(false);
  const [scene, setScene] = useState(false);
  const picks = businesses.filter((b) => b.featured).slice(0, 3);
  return (
    <div className={`hero-visual ${paused ? "scene-paused" : ""}`}>
      <div className="visual-orbit orbit-one" />
      <div className="visual-orbit orbit-two" />
      <span className="scene-coordinate">
        TU COMUNIDAD / TU LUGAR <span>EL BARRIO EN MOVIMIENTO</span>
      </span>
      {scene ? (
        <Scene paused={paused} />
      ) : (
        <div
          className="hero-photo-window"
          role="img"
          aria-label="Escena ilustrativa de comercios del barrio al anochecer"
        />
      )}
      <button
        className="scene-mode"
        onClick={() => setScene(!scene)}
        aria-pressed={scene}
      >
        {scene ? <Camera size={14} /> : <Box size={14} />}{" "}
        {scene ? "Ver fotografía" : "Explorar en 3D"}
      </button>
      <div className="scene-location">
        <span className="live-dot" />
        <MapPin size={14} />
        {neighborhood}
        <span>Conectados.</span>
      </div>
      {picks.map((b, i) => (
        <button
          className={`floating-shop shop-${i + 1}`}
          key={b.id}
          onClick={() => onSelect(b)}
          aria-label={`Descubrir ${b.name}`}
        >
          <BusinessPhoto business={b} priority />
          <span className="floating-shop-copy">
            <small>{b.category}</small>
            <strong>{b.name}</strong>
          </span>
          <ArrowUpRight size={18} />
        </button>
      ))}
      <div className="scene-caption">
        <Sparkles size={15} />
        <span>
          Lo de siempre.<strong>Como nunca lo viste.</strong>
        </span>
      </div>
      <button
        className="scene-toggle"
        aria-label={
          paused
            ? "Activar movimiento de la escena"
            : "Pausar movimiento de la escena"
        }
        aria-pressed={paused}
        onClick={() => setPaused(!paused)}
      >
        {paused ? <Play size={15} /> : <Pause size={15} />}
      </button>
    </div>
  );
}
