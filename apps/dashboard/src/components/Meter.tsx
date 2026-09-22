/**
 * Verticale meter die de put uitbeeldt: de baan is een lichtere stap van
 * dezelfde blauwe ramp als de vulling, zodat de toestand over de hele hoogte
 * leesbaar blijft. De vulling heeft een afgeronde bovenkant (het datapunt) en
 * een vierkante onderkant (de nullijn).
 */
export function Meter({ fractie }: { fractie: number }) {
  const breedte = 56;
  const hoogte = 170;

  const begrensd = Math.min(1, Math.max(0, fractie));
  const vulHoogte = begrensd * hoogte;
  const straal = Math.min(4, vulHoogte);
  const top = hoogte - vulHoogte;

  const pad =
    vulHoogte <= 0
      ? ""
      : [
          `M 0 ${hoogte}`,
          `L 0 ${top + straal}`,
          `Q 0 ${top} ${straal} ${top}`,
          `L ${breedte - straal} ${top}`,
          `Q ${breedte} ${top} ${breedte} ${top + straal}`,
          `L ${breedte} ${hoogte}`,
          "Z",
        ].join(" ");

  return (
    <svg
      width={breedte}
      height={hoogte}
      viewBox={`0 0 ${breedte} ${hoogte}`}
      role="img"
      aria-label={`Vulniveau ${Math.round(begrensd * 100)} procent`}
      style={{ flexShrink: 0 }}
    >
      <defs>
        <clipPath id="meter-vorm">
          <rect x="0" y="0" width={breedte} height={hoogte} rx="8" />
        </clipPath>
      </defs>

      <rect
        x="0"
        y="0"
        width={breedte}
        height={hoogte}
        rx="8"
        fill="var(--meter-track)"
      />

      {pad && (
        <path d={pad} fill="var(--series-1)" clipPath="url(#meter-vorm)" />
      )}
    </svg>
  );
}
