export function HauntedArt() {
  return (
    <svg
      className="haunted-art"
      viewBox="0 0 640 640"
      role="img"
      aria-label="A mysterious manor beneath an autumn moon"
    >
      <defs>
        <radialGradient id="moon">
          <stop stopColor="#f8d89b" />
          <stop offset=".7" stopColor="#d98950" />
          <stop offset="1" stopColor="#b35432" />
        </radialGradient>
        <radialGradient id="glow">
          <stop stopColor="#b55735" stopOpacity=".24" />
          <stop offset="1" stopColor="#b55735" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="fog" x2="0" y2="1">
          <stop stopColor="#51434f" stopOpacity="0" />
          <stop offset="1" stopColor="#17151e" />
        </linearGradient>
        <filter id="blur">
          <feGaussianBlur stdDeviation="13" />
        </filter>
      </defs>
      <circle cx="330" cy="280" r="285" fill="url(#glow)" />
      <circle cx="330" cy="260" r="210" fill="none" stroke="#c78655" strokeOpacity=".16" />
      <circle cx="330" cy="260" r="194" fill="none" stroke="#c78655" strokeOpacity=".1" />
      <circle cx="330" cy="258" r="158" fill="url(#moon)" />
      <g fill="#b9683d" opacity=".25">
        <circle cx="270" cy="186" r="24" />
        <circle cx="365" cy="240" r="41" />
        <circle cx="300" cy="310" r="28" />
        <circle cx="410" cy="178" r="16" />
      </g>
      <g fill="#15131b">
        <path d="M125 500v-173l62-65 63 65v173zM239 507V250l80-84 81 84v257zM386 510V315l56-55 58 55v195z" />
        <path d="m107 330 80-93 80 93-80-59zm113-71 99-117 100 117-100-69zm150 63 72-83 76 83-76-54z" />
        <path d="M299 180v-57h39v57m-30-57V99h20v24M453 283v-69h20v92" />
        <path d="M102 500h431v39H102zM165 284v-62h20v40M140 224h68l-34-48z" />
      </g>
      <g fill="#db9453">
        <path d="M302 242q17-29 34 0v41h-34zM299 325q20-34 40 0v46h-40zM172 335q15-22 29 0v27h-29zM426 327q15-22 29 0v27h-29zM168 404h35v37h-35zM425 397h35v37h-35z" />
        <path d="M293 503v-65q27-42 54 0v65z" fill="#ac633c" />
      </g>
      <g stroke="#15131b" strokeWidth="5">
        <path d="M319 226v58m-20-22h40M318 305v65m-21-23h43M187 320v43m-17-18h34M441 315v40m-17-18h33M185 403v40m256-46v38" />
      </g>
      <g fill="#121118">
        <path d="M37 565 67 318l-29-79 40 55 12-99 8 116 48-55-42 82 5 226zM591 570l-18-261 37-91-45 60-8-99-12 131-47-56 42 92-18 225z" />
        <path d="m75 338-49-51 49 28 5-99 12 116-5 19zm482 20 65-64-58 32-2-89-14 113z" />
        <path d="m385 119 20 5 19-12-8 17 8 13-20-7-15 9 5-15-9-10zm91 87 15 3 15-10-6 14 6 10-15-5-11 7 3-12-7-7zM200 163l14 3 14-9-6 13 6 10-15-6-12 7 5-12z" />
        <path d="M0 555q130-68 257-27t383-6v118H0z" />
      </g>
      <ellipse cx="330" cy="507" rx="230" ry="19" fill="#8a778b" opacity=".1" filter="url(#blur)" />
      <path d="M0 466q170-50 320 0t320-11v185H0z" fill="url(#fog)" />
      <g fill="#cb8453" opacity=".65">
        <circle cx="121" cy="195" r="1.5" />
        <circle cx="473" cy="122" r="1.5" />
        <circle cx="519" cy="402" r="1.5" />
        <circle cx="208" cy="102" r="1" />
        <circle cx="153" cy="445" r="1" />
      </g>
    </svg>
  );
}
