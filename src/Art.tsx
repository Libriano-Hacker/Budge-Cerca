export function StoreArt({ kind = "sand" }: { kind?: string }) {
  const colors: Record<string, [string, string, string]> = {
    sand: ["#eee3cf", "#a66b42", "#f5c96b"],
    sage: ["#dce8df", "#2b6554", "#9bb8a3"],
    rose: ["#efe2e0", "#9b6464", "#dda8a4"],
    blue: ["#dee8ed", "#4b6e87", "#9bb9c8"],
    lilac: ["#e6e0ee", "#7c698c", "#bca7d1"],
    peach: ["#f1dfd4", "#995d41", "#e9aa7d"],
  };
  const [bg, main, light] = colors[kind] || colors.sand;
  return (
    <svg
      className="store-art"
      viewBox="0 0 500 270"
      fill="none"
      aria-hidden="true"
    >
      <rect width="500" height="270" fill={bg} />
      <circle cx="405" cy="53" r="25" fill="#fff" opacity=".45" />
      <path d="M0 238h500" stroke={main} strokeOpacity=".12" strokeWidth="2" />
      <ellipse cx="262" cy="239" rx="158" ry="11" fill={main} opacity=".10" />
      <rect x="131" y="74" width="237" height="163" rx="4" fill="#fffdf6" />
      <rect x="145" y="58" width="209" height="39" rx="5" fill={main} />
      <path
        d="M188 78h122"
        stroke="#fffdf6"
        strokeWidth="5"
        strokeLinecap="round"
        opacity=".7"
      />
      <path d="m132 105-15 38h265l-15-38H132Z" fill={light} />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <path
          key={i}
          d={`m${132 + i * 34} 105 ${i < 3 ? -8 : 4} 38h18l${i < 3 ? 6 : -6}-38Z`}
          fill={main}
          opacity=".55"
        />
      ))}
      <path
        d="M117 143v9c0 14 25 14 25 0 0 14 26 14 26 0 0 14 27 14 27 0 0 14 27 14 27 0 0 14 27 14 27 0 0 14 27 14 27 0 0 14 27 14 27 0 0 14 26 14 26 0 0 14 27 14 27 0 0 14 26 14 26 0v-9H117Z"
        fill={light}
      />
      <rect
        x="151"
        y="169"
        width="120"
        height="50"
        rx="3"
        fill={main}
        opacity=".17"
      />
      <path
        d="m158 207 34-31h20l-35 31h-19ZM217 207l35-31h10v11l-23 20h-22Z"
        fill="#fff"
        opacity=".5"
      />
      <rect x="285" y="163" width="60" height="74" rx="3" fill={main} />
      <rect x="294" y="174" width="42" height="36" rx="2" fill={bg} />
      <circle cx="334" cy="219" r="2" fill="#fff" />
      <path
        d="M97 238v-43m0 17-11-13m11 2 12-14"
        stroke={main}
        strokeWidth="4"
        strokeLinecap="round"
      />
      <ellipse
        cx="87"
        cy="190"
        rx="10"
        ry="17"
        fill={light}
        transform="rotate(-30 87 190)"
      />
      <ellipse
        cx="107"
        cy="181"
        rx="10"
        ry="17"
        fill={main}
        opacity=".7"
        transform="rotate(30 107 181)"
      />
      <path d="M83 222h28l-4 17H87l-4-17Z" fill={main} />
      <rect
        x="384"
        y="199"
        width="27"
        height="40"
        rx="3"
        fill={main}
        opacity=".7"
      />
      <path d="M389 207h17m-17 7h13" stroke={bg} strokeWidth="2" />
      {kind === "sand" && (
        <>
          <path
            d="M167 206c0-20 27-20 27 0h-27Zm36 0c0-20 27-20 27 0h-27Zm35 0c0-20 24-20 24 0h-24Z"
            fill={light}
          />
          <path
            d="m174 193 3 5m34-5 3 5m31-5 3 5"
            stroke={main}
            strokeWidth="2"
          />
        </>
      )}
      {kind === "sage" && (
        <>
          <path
            d="M182 192h22v13h-22zM205 195h6v6h-6"
            stroke={main}
            strokeWidth="3"
          />
          <path
            d="M187 184v-7m10 7v-7"
            stroke={main}
            strokeLinecap="round"
            opacity=".5"
          />
        </>
      )}
      {kind === "rose" && (
        <path
          d="m187 181 14-6 13 6 10 13-9 5-5-8v24h-19v-24l-5 8-9-5 10-13Z"
          fill={main}
          opacity=".8"
        />
      )}
    </svg>
  );
}

export function NeighborhoodArt() {
  return (
    <svg
      viewBox="0 0 600 420"
      className="neighborhood-art"
      fill="none"
      aria-label="Ilustración de comercios conectados en un barrio"
    >
      <defs>
        <pattern id="dots" width="24" height="24" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1" fill="#134e4a" opacity=".12" />
        </pattern>
      </defs>
      <rect width="600" height="420" rx="30" fill="url(#dots)" />
      <path d="M45 275 272 386 566 221 337 107 45 275Z" fill="#e0e9dd" />
      <path
        d="m72 259 233 112M173 203l239 110M277 150l240 110M156 322l298-165M258 373l288-165"
        stroke="#faf9f4"
        strokeWidth="25"
      />
      <path
        d="m72 259 233 112M173 203l239 110M277 150l240 110M156 322l298-165"
        stroke="#d8dfd4"
        strokeDasharray="4 9"
        strokeWidth="1"
      />
      <path
        d="m254 293 63-36 90 43"
        stroke="#d78b5f"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray="5 9"
      />
      <g transform="translate(290 47)">
        <path d="m0 86 82 41 79-44-81-42L0 86Z" fill="#e6c9a9" />
        <path d="M0 86v83l82 42v-84L0 86Z" fill="#f1dfc5" />
        <path d="m82 127 79-44v84l-79 44v-84Z" fill="#dab38c" />
        <path d="m-8 87 89 44 88-48-89-44-88 48Z" fill="#245a4b" />
        <path d="m82 131 87-48v18l-87 48v-18Z" fill="#18483c" />
        <path
          d="m96 156 25-14v41l-25 14v-41ZM134 135l15-8v21l-15 8v-21Z"
          fill="#4c7d6f"
        />
        <path d="m19 121 45 22v35l-45-22v-35Z" fill="#fcf7eb" />
        <path d="m19 121 45 22v9l-45-22v-9Z" fill="#a9bd9b" />
      </g>
      <g transform="translate(121 153)">
        <path d="m0 57 73 37 70-39L71 19 0 57Z" fill="#d5a07c" />
        <path d="M0 57v62l73 37V94L0 57Z" fill="#f5e7d6" />
        <path d="m73 94 70-39v62l-70 39V94Z" fill="#e7c8ab" />
        <path d="m-9 60 81 40 80-44-82-40-79 44Z" fill="#c57c54" />
        <path d="m-9 60 81 40v16L-9 76V60Z" fill="#e5ac7f" />
        <path
          d="m6 68 14 7v16L6 84V68Zm29 14 14 7v16l-14-7V82Z"
          fill="#fff4dd"
        />
        <path d="m14 100 40 20v24l-40-20v-24Z" fill="#6f8f7e" />
        <path d="m88 110 24-13v39l-24 13v-39Z" fill="#8d634b" />
      </g>
      <g transform="translate(357 230)">
        <path d="m0 30 51 26 53-30L52 0 0 30Z" fill="#c9b5b3" />
        <path d="M0 30v58l51 26V56L0 30Z" fill="#ead9d1" />
        <path d="m51 56 53-30v58l-53 30V56Z" fill="#d3b6ae" />
        <path d="m-5 33 56 28 59-33-58-28-57 33Z" fill="#8e706c" />
        <path d="m62 69 20-11v35l-20 11V69Z" fill="#faf3e4" />
        <path d="m12 57 26 13v23L12 80V57Z" fill="#9eab97" />
      </g>
      <g fill="#719773">
        <ellipse cx="111" cy="206" rx="16" ry="24" />
        <ellipse cx="472" cy="184" rx="17" ry="26" />
        <ellipse cx="314" cy="338" rx="14" ry="22" />
      </g>
      <g stroke="#567657" strokeWidth="4">
        <path d="M111 220v24m361-45v24m-158 129v20" />
      </g>
      <g transform="translate(301 112)">
        <path
          d="M0-58c-21 0-35 15-35 34C-35 0 0 32 0 32S35 0 35-24C35-43 21-58 0-58Z"
          fill="#d88b5c"
        />
        <circle cy="-25" r="13" fill="#fff7e8" />
        <path
          d="m-6-25 5 5 9-10"
          stroke="#d88b5c"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      <circle cx="251" cy="294" r="17" fill="#134e4a" opacity=".12" />
      <circle
        cx="251"
        cy="294"
        r="7"
        fill="#134e4a"
        stroke="white"
        strokeWidth="3"
      />
    </svg>
  );
}
