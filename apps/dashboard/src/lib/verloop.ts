import { leesConfiguratie } from "./config";
import { haalVerloop } from "./history";
import { berekenNiveau } from "./level";
import type { PeriodeSleutel } from "./periodes";

export type VerloopPunt = {
  ts: number;
  percentage: number | null;
  afstandMm: number | null;
  liter: number | null;
};

/**
 * Zet de ruwe afstanden om naar vulniveaus. De serverpagina en de
 * /api/history-route gebruiken allebei deze functie, zodat de eerste render en
 * een latere fetch gegarandeerd dezelfde vorm opleveren.
 */
export function verloopMetNiveau(periode: PeriodeSleutel): VerloopPunt[] {
  const config = leesConfiguratie();

  return haalVerloop(periode).map((punt) => {
    if (punt.afstandMm === null || config === null) {
      return { ts: punt.ts, percentage: null, afstandMm: punt.afstandMm, liter: null };
    }

    const niveau = berekenNiveau(punt.afstandMm, config);
    return {
      ts: punt.ts,
      percentage: niveau.percentage,
      afstandMm: punt.afstandMm,
      liter: niveau.liter,
    };
  });
}
