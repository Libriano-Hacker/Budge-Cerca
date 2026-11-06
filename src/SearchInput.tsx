import { useId, useState } from "react";
import { Search, ArrowRight } from "lucide-react";
import type { Business } from "./domain";
import { searchSuggestions } from "./catalogInsights";
export default function SearchInput({
  query,
  onChange,
  businesses,
  onSearch,
  hero = false,
}: {
  query: string;
  onChange: (value: string) => void;
  businesses: Business[];
  onSearch: () => void;
  hero?: boolean;
}) {
  const id = useId();
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(-1);
  const suggestions = searchSuggestions(businesses, query);
  const expanded = focused && suggestions.length > 0;
  function choose(value: string) {
    onChange(value);
    setFocused(false);
    setActive(-1);
    onSearch();
  }
  return (
    <div className={`guided-search ${hero ? "hero-guided" : "sub-guided"}`}>
      <form
        className={hero ? "hero-search" : "subpage-search"}
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          if (expanded && active >= 0 && suggestions[active])
            choose(suggestions[active].value);
          else {
            setFocused(false);
            onSearch();
          }
        }}
      >
        <Search size={hero ? 21 : 20} />
        <input
          aria-label="Buscar comercios"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={expanded}
          aria-controls={id}
          aria-activedescendant={
            expanded && active >= 0 ? `${id}-${active}` : undefined
          }
          autoComplete="off"
          maxLength={120}
          value={query}
          placeholder={
            hero
              ? "¿Qué estás buscando hoy?"
              : "Buscar comercio, rubro o servicio"
          }
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(e) => {
            onChange(e.target.value);
            setActive(-1);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setFocused(false);
              setActive(-1);
            }
            if (
              ["ArrowDown", "ArrowUp"].includes(e.key) &&
              suggestions.length
            ) {
              e.preventDefault();
              setFocused(true);
              setActive((i) =>
                i < 0
                  ? e.key === "ArrowDown"
                    ? 0
                    : suggestions.length - 1
                  : (i +
                      (e.key === "ArrowDown" ? 1 : -1) +
                      suggestions.length) %
                    suggestions.length,
              );
            }
          }}
        />
        {hero && (
          <button type="submit">
            Buscar
            <ArrowRight size={17} />
          </button>
        )}
      </form>
      {expanded && (
        <ul
          className="search-suggestions-live"
          id={id}
          role="listbox"
          aria-label="Sugerencias de búsqueda"
        >
          {suggestions.map((s, i) => (
            <li
              key={`${s.kind}-${s.value}`}
              id={`${id}-${i}`}
              role="option"
              aria-selected={active === i}
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => choose(s.value)}
            >
              <Search size={15} />
              <span>{s.value}</span>
              <small>{s.kind}</small>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
