import { MapPin, ChevronDown } from "lucide-react";

export default function NeighborhoodPicker({
  neighborhoods,
  selected,
  onSelect,
}: {
  neighborhoods: string[];
  selected: string;
  onSelect: (name: string) => void;
}) {
  return (
    <section
      className="neighborhood-picker container"
      aria-label="Elegí tu barrio"
    >
      <label className="neighborhood-select">
        <MapPin size={18} />
        <span className="sr-only">Seleccionar barrio</span>
        <select
          aria-label="Seleccionar barrio"
          value={selected}
          onChange={(e) => onSelect(e.target.value)}
        >
          {neighborhoods.map((name) => (
            <option key={name}>{name}</option>
          ))}
        </select>
        <ChevronDown size={16} />
      </label>
    </section>
  );
}
