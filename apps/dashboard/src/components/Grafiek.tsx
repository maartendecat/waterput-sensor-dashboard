"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { TIJDZONE } from "@/lib/format";
import type { PeriodeSleutel } from "@/lib/periodes";

export type GrafiekPunt = {
  ts: number;
  percentage: number | null;
  afstandMm: number | null;
  liter: number | null;
};

const HOOGTE = 260;
const PAD = { top: 16, right: 16, bottom: 28, left: 40 };

const TIK_OPMAAK: Record<PeriodeSleutel, Intl.DateTimeFormatOptions> = {
  "24u": { hour: "2-digit", minute: "2-digit" },
  "7d": { weekday: "short", day: "numeric" },
  "30d": { day: "numeric", month: "short" },
  "12m": { month: "short" },
};

const TOOLTIP_OPMAAK: Record<PeriodeSleutel, Intl.DateTimeFormatOptions> = {
  "24u": { hour: "2-digit", minute: "2-digit" },
  "7d": { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" },
  "30d": { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" },
  "12m": { day: "numeric", month: "long", year: "numeric" },
};

function opmaak(opties: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("nl-BE", { ...opties, timeZone: TIJDZONE });
}

export function Grafiek({
  punten,
  periode,
  vervaagd = false,
}: {
  punten: GrafiekPunt[];
  periode: PeriodeSleutel;
  vervaagd?: boolean;
}) {
  const omhulsel = useRef<HTMLDivElement>(null);
  const [breedte, setBreedte] = useState(0);
  const [actief, setActief] = useState<number | null>(null);

  useEffect(() => {
    const el = omhulsel.current;
    if (!el) return;

    const waarnemer = new ResizeObserver(([item]) => {
      setBreedte(item.contentRect.width);
    });
    waarnemer.observe(el);
    return () => waarnemer.disconnect();
  }, []);

  const model = useMemo(() => {
    if (breedte === 0 || punten.length === 0) return null;

    const plotB = Math.max(1, breedte - PAD.left - PAD.right);
    const plotH = HOOGTE - PAD.top - PAD.bottom;

    const tsMin = punten[0].ts;
    const tsMax = punten[punten.length - 1].ts;
    const spanne = tsMax - tsMin;

    // Bij een enkel punt (of alles op hetzelfde tijdstip) zetten we het in het
    // midden in plaats van te delen door nul.
    const sx = (ts: number) =>
      spanne === 0 ? PAD.left + plotB / 2 : PAD.left + ((ts - tsMin) / spanne) * plotB;
    const sy = (pct: number) => PAD.top + (1 - pct / 100) * plotH;

    const nullijn = sy(0);

    // Nulls breken de lijn op: een gat in de grafiek is precies hoe een
    // sensoruitval hoort te lezen.
    const segmenten: { x: number; y: number }[][] = [];
    let lopend: { x: number; y: number }[] = [];
    for (const p of punten) {
      if (p.percentage === null) {
        if (lopend.length > 0) segmenten.push(lopend);
        lopend = [];
      } else {
        lopend.push({ x: sx(p.ts), y: sy(p.percentage) });
      }
    }
    if (lopend.length > 0) segmenten.push(lopend);

    const lijnPaden = segmenten
      .filter((s) => s.length > 1)
      .map((s) => s.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" "));

    const vlakPaden = segmenten
      .filter((s) => s.length > 1)
      .map(
        (s) =>
          `M ${s[0].x} ${nullijn} ` +
          s.map((p) => `L ${p.x} ${p.y}`).join(" ") +
          ` L ${s[s.length - 1].x} ${nullijn} Z`,
      );

    const losseStippen = segmenten.filter((s) => s.length === 1).map((s) => s[0]);

    const aantalTikken = Math.max(2, Math.min(6, Math.floor(plotB / 110)));
    const tikFormatter = opmaak(TIK_OPMAAK[periode]);
    const xTikken = Array.from({ length: aantalTikken }, (_, i) => {
      const ts = tsMin + (spanne * i) / (aantalTikken - 1);
      return { ts, x: sx(ts), label: tikFormatter.format(new Date(ts * 1000)) };
    });

    const laatsteGeldig = [...punten].reverse().find((p) => p.percentage !== null) ?? null;

    return { plotB, plotH, sx, sy, nullijn, lijnPaden, vlakPaden, losseStippen, xTikken, laatsteGeldig, tsMin, spanne };
  }, [breedte, punten, periode]);

  if (punten.length === 0) {
    return (
      <div ref={omhulsel} style={{ height: HOOGTE, display: "grid", placeItems: "center" }}>
        <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
          Nog geen metingen in deze periode.
        </p>
      </div>
    );
  }

  function bijBeweging(e: ReactPointerEvent<SVGSVGElement>) {
    if (!model) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;

    let dichtstbij = 0;
    let besteAfstand = Infinity;
    punten.forEach((p, i) => {
      const d = Math.abs(model.sx(p.ts) - x);
      if (d < besteAfstand) {
        besteAfstand = d;
        dichtstbij = i;
      }
    });
    setActief(dichtstbij);
  }

  function bijToets(e: ReactKeyboardEvent<SVGSVGElement>) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const stap = e.key === "ArrowRight" ? 1 : -1;
    const huidig = actief ?? punten.length - 1;
    setActief(Math.min(punten.length - 1, Math.max(0, huidig + stap)));
  }

  const actiefPunt = actief !== null ? punten[actief] : null;
  const tooltipFormatter = opmaak(TOOLTIP_OPMAAK[periode]);

  return (
    <div
      ref={omhulsel}
      style={{
        position: "relative",
        opacity: vervaagd ? 0.45 : 1,
        transition: "opacity 120ms ease",
      }}
    >
      {model && (
        <svg
          width={breedte}
          height={HOOGTE}
          role="img"
          aria-label="Verloop van het vulniveau. Gebruik de pijltjestoetsen om waarden te overlopen."
          tabIndex={0}
          onPointerMove={bijBeweging}
          onPointerLeave={() => setActief(null)}
          onBlur={() => setActief(null)}
          onKeyDown={bijToets}
          style={{ display: "block", touchAction: "pan-y", outlineOffset: 2 }}
        >
          {/* Rasterlijnen — haarlijn, doorlopend, terugtredend. */}
          {[0, 25, 50, 75, 100].map((pct) => (
            <g key={pct}>
              <line
                x1={PAD.left}
                x2={breedte - PAD.right}
                y1={model.sy(pct)}
                y2={model.sy(pct)}
                stroke={pct === 0 ? "var(--axis)" : "var(--gridline)"}
                strokeWidth="1"
                shapeRendering="crispEdges"
              />
              <text
                x={PAD.left - 8}
                y={model.sy(pct)}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize="11"
                fill="var(--text-muted)"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {pct}
              </text>
            </g>
          ))}

          {model.xTikken.map((tik, i) => (
            <text
              key={i}
              x={tik.x}
              y={HOOGTE - 8}
              textAnchor={i === 0 ? "start" : i === model.xTikken.length - 1 ? "end" : "middle"}
              fontSize="11"
              fill="var(--text-muted)"
            >
              {tik.label}
            </text>
          ))}

          {/* Vlak: de reekskleur als wassing van 10%, nooit een vol blok. */}
          {model.vlakPaden.map((d, i) => (
            <path key={i} d={d} fill="var(--series-1)" fillOpacity="0.10" />
          ))}

          {model.lijnPaden.map((d, i) => (
            <path
              key={i}
              d={d}
              fill="none"
              stroke="var(--series-1)"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}

          {model.losseStippen.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="3" fill="var(--series-1)" />
          ))}

          {/* Eindpunt: gevulde stip met een ring in de oppervlaktekleur. */}
          {model.laatsteGeldig && (
            <circle
              cx={model.sx(model.laatsteGeldig.ts)}
              cy={model.sy(model.laatsteGeldig.percentage!)}
              r="4.5"
              fill="var(--series-1)"
              stroke="var(--surface-1)"
              strokeWidth="2"
            />
          )}

          {/* Kruisdraad bij aanwijzen. */}
          {actiefPunt && (
            <>
              <line
                x1={model.sx(actiefPunt.ts)}
                x2={model.sx(actiefPunt.ts)}
                y1={PAD.top}
                y2={model.nullijn}
                stroke="var(--axis)"
                strokeWidth="1"
                shapeRendering="crispEdges"
              />
              {actiefPunt.percentage !== null && (
                <circle
                  cx={model.sx(actiefPunt.ts)}
                  cy={model.sy(actiefPunt.percentage)}
                  r="4.5"
                  fill="var(--series-1)"
                  stroke="var(--surface-1)"
                  strokeWidth="2"
                />
              )}
            </>
          )}
        </svg>
      )}

      {model && actiefPunt && (
        <div
          role="status"
          style={{
            position: "absolute",
            top: 0,
            left: Math.min(
              Math.max(0, model.sx(actiefPunt.ts) - 80),
              Math.max(0, breedte - 168),
            ),
            width: 168,
            pointerEvents: "none",
            background: "var(--surface-1)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "8px 10px",
            fontSize: 12,
            lineHeight: 1.5,
            boxShadow: "0 2px 10px rgba(0,0,0,0.10)",
          }}
        >
          <div style={{ color: "var(--text-muted)" }}>
            {tooltipFormatter.format(new Date(actiefPunt.ts * 1000))}
          </div>
          {actiefPunt.percentage === null ? (
            <div style={{ color: "var(--text-secondary)" }}>Geen meting</div>
          ) : (
            <div style={{ color: "var(--text-primary)", fontWeight: 600 }}>
              {Math.round(actiefPunt.percentage)}&thinsp;%
              {actiefPunt.liter !== null && (
                <span style={{ fontWeight: 400, color: "var(--text-secondary)" }}>
                  {" · "}
                  {new Intl.NumberFormat("nl-BE", { maximumFractionDigits: 0 }).format(
                    actiefPunt.liter,
                  )}{" "}
                  l
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
