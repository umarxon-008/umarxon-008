// Sodda, do'stona 2D illustratsiyalar (inline SVG). Tekis ranglar, yumaloq shakllar.

export function EnergyRobot({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 260" className={className} role="img" aria-label="EnergyComp do'stona energiya roboti">
      <ellipse cx="110" cy="248" rx="70" ry="9" fill="#102B5C" opacity="0.08" />
      {/* antenna */}
      <line x1="110" y1="26" x2="110" y2="50" stroke="#102B5C" strokeWidth="5" strokeLinecap="round" />
      <g className="ec-pulse">
        <circle cx="110" cy="20" r="10" fill="#20B879" />
        <path d="M112 13 105 22h5l-2 6 7-9h-5l2-6Z" fill="#fff" />
      </g>
      {/* head */}
      <rect x="45" y="48" width="130" height="92" rx="34" fill="#fff" stroke="#102B5C" strokeWidth="5" />
      <rect x="62" y="66" width="96" height="56" rx="22" fill="#102B5C" />
      <g className="ec-blink">
        <circle cx="90" cy="92" r="9" fill="#5BE0A6" />
        <circle cx="130" cy="92" r="9" fill="#5BE0A6" />
        <circle cx="93" cy="89" r="3" fill="#fff" />
        <circle cx="133" cy="89" r="3" fill="#fff" />
      </g>
      <path d="M98 107q12 9 24 0" stroke="#5BE0A6" strokeWidth="4" fill="none" strokeLinecap="round" />
      <rect x="34" y="80" width="14" height="30" rx="7" fill="#1677F2" />
      <rect x="172" y="80" width="14" height="30" rx="7" fill="#1677F2" />
      {/* body */}
      <rect x="62" y="146" width="96" height="78" rx="26" fill="#1677F2" stroke="#102B5C" strokeWidth="5" />
      <circle cx="110" cy="184" r="22" fill="#fff" />
      <path className="ec-pulse" d="M114 168 100 188h9l-3 12 14-19h-9l3-13Z" fill="#20B879" />
      {/* arms */}
      <path d="M62 168q-26 6-30 30" stroke="#102B5C" strokeWidth="5" fill="none" strokeLinecap="round" />
      <circle cx="31" cy="203" r="10" fill="#fff" stroke="#102B5C" strokeWidth="5" />
      <path d="M158 168q24-10 32-38" stroke="#102B5C" strokeWidth="5" fill="none" strokeLinecap="round" />
      <circle cx="191" cy="125" r="10" fill="#fff" stroke="#102B5C" strokeWidth="5" />
      {/* legs */}
      <rect x="80" y="222" width="18" height="22" rx="8" fill="#102B5C" />
      <rect x="122" y="222" width="18" height="22" rx="8" fill="#102B5C" />
    </svg>
  );
}

export function FactoryScene({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 520 300" className={className} role="img" aria-label="Zavod va stanoklar illustratsiyasi">
      <rect x="0" y="262" width="520" height="38" rx="12" fill="#E3EDFB" />
      {/* factory building */}
      <path d="M40 262V140l70 40v-40l70 40v-40l70 40V96h48v166H40Z" fill="#fff" stroke="#102B5C" strokeWidth="4" strokeLinejoin="round" />
      <rect x="262" y="60" width="26" height="40" rx="4" fill="#102B5C" />
      <circle className="ec-smoke" cx="280" cy="50" r="10" fill="#D3E5FD" />
      <circle className="ec-smoke ec-smoke-2" cx="284" cy="48" r="8" fill="#D3E5FD" />
      <rect x="64" y="200" width="36" height="28" rx="6" fill="#D3E5FD" />
      <rect x="134" y="200" width="36" height="28" rx="6" fill="#D3E5FD" />
      <rect x="204" y="200" width="36" height="28" rx="6" fill="#D3E5FD" />
      <rect x="262" y="190" width="30" height="72" rx="6" fill="#1677F2" />
      {/* solar panel */}
      <path d="M318 120h70l-12 30h-70Z" fill="#1677F2" stroke="#102B5C" strokeWidth="3" />
      <path d="M330 120l-12 30M353 120l-12 30M376 120l-12 30M312 135h70" stroke="#fff" strokeWidth="2" />
      <line x1="345" y1="150" x2="345" y2="262" stroke="#102B5C" strokeWidth="4" />
      {/* machine */}
      <rect x="370" y="186" width="110" height="76" rx="14" fill="#fff" stroke="#102B5C" strokeWidth="4" />
      <rect x="386" y="200" width="46" height="30" rx="6" fill="#102B5C" />
      <path className="ec-draw" d="M392 222l8-8 8 5 10-11 8 6" stroke="#5BE0A6" strokeWidth="3" fill="none" strokeLinecap="round" />
      <circle className="ec-pulse" cx="455" cy="207" r="7" fill="#20B879" />
      <circle cx="455" cy="230" r="7" fill="#F2B01E" />
      <rect x="386" y="240" width="78" height="8" rx="4" fill="#D3E5FD" />
      {/* energy line */}
      {/* energiya oqimi: panel → zavod → stanok */}
      <path className="ec-flow" d="M345 200V230q0 8 8 8h17" stroke="#20B879" strokeWidth="4" fill="none" strokeLinecap="round" />
      <path className="ec-flow" d="M292 238h53" stroke="#20B879" strokeWidth="4" fill="none" strokeLinecap="round" />
      <g className="ec-pulse">
        <circle cx="470" cy="150" r="22" fill="#E6F8F0" />
        <path d="M473 136 461 154h8l-3 11 12-17h-8l3-12Z" fill="#20B879" />
      </g>
    </svg>
  );
}

export function MiniMachine({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <rect x="6" y="18" width="52" height="38" rx="9" fill="#fff" stroke="#102B5C" strokeWidth="3" />
      <rect x="14" y="26" width="22" height="14" rx="3" fill="#102B5C" />
      <circle cx="46" cy="30" r="4" fill="#20B879" />
      <circle cx="46" cy="42" r="4" fill="#F2B01E" />
      <rect x="20" y="8" width="24" height="10" rx="3" fill="#1677F2" />
    </svg>
  );
}
