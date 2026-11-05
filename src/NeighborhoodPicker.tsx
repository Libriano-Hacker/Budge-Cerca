import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { MapPin, Plus, ChevronDown, X } from "lucide-react";
export default function NeighborhoodPicker({
  neighborhoods,
  selected,
  counts,
  onSelect,
  onAdd,
}: {
  neighborhoods: string[];
  selected: string;
  counts: Record<string, number>;
  onSelect: (name: string) => void;
  onAdd: (name: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const selectRef = useRef<HTMLSelectElement>(null);
  function add(e: FormEvent) {
    e.preventDefault();
    try {
      onAdd(name);
      setName("");
      setError("");
      setAdding(false);
      selectRef.current?.focus();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No pudimos agregar ese barrio.",
      );
    }
  }
  return (
    <section
      className="neighborhood-picker container"
      aria-label="Elegí tu barrio"
    >
      <div className="neighborhood-picker-top">
        <div>
          <span className="eyebrow">TU COMUNIDAD, A UN TOQUE</span>
          <p>¿En qué barrio estás?</p>
        </div>
        <label className="neighborhood-select">
          <MapPin size={18} />
          <span className="sr-only">Seleccionar barrio</span>
          <select
            ref={selectRef}
            aria-label="Seleccionar barrio"
            value={selected}
            onChange={(e) => onSelect(e.target.value)}
          >
            {neighborhoods.map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
          <ChevronDown size={16} />
        </label>
        <button
          className="button button-ghost"
          onClick={() => {
            setAdding(!adding);
            setError("");
          }}
          aria-expanded={adding}
          aria-controls="add-neighborhood"
        >
          {adding ? <X size={16} /> : <Plus size={16} />}Agregar barrio
        </button>
      </div>
      <nav className="neighborhood-tabs" aria-label="Barrios disponibles">
        {neighborhoods.map((n) => (
          <button
            key={n}
            className={n === selected ? "active" : ""}
            aria-pressed={n === selected}
            onClick={() => onSelect(n)}
          >
            {n}
            <span aria-hidden="true">{counts[n] || 0}</span>
          </button>
        ))}
      </nav>
      {adding && (
        <form
          id="add-neighborhood"
          className="neighborhood-add-form"
          onSubmit={add}
        >
          <label htmlFor="new-neighborhood">
            Nombre del nuevo barrio
            <input
              id="new-neighborhood"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              required
              placeholder="Por ejemplo: Villa Centenario"
            />
          </label>
          <button className="button button-primary" type="submit">
            <Plus size={16} />
            Guardar barrio
          </button>
          <small>
            El barrio se agrega a este navegador. Después podés cargar sus
            comercios desde el dashboard.
          </small>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
        </form>
      )}
    </section>
  );
}
