import { getDb } from "./db";
import { PERIODES, type PeriodeSleutel } from "./periodes";

export type Meting = {
  ts: number;
  afstandMm: number | null;
  fout: string | null;
};

export type Punt = {
  /** Begin van de bucket, unix-seconden. */
  ts: number;
  /** Gemiddelde afstand in de bucket, of null als elke meting mislukte. */
  afstandMm: number | null;
  /** Aantal mislukte metingen in deze bucket. */
  fouten: number;
};

export function laatsteMeting(): Meting | null {
  const rij = getDb()
    .prepare(
      "SELECT ts, distance_mm, error FROM measurements ORDER BY ts DESC LIMIT 1",
    )
    .get() as { ts: number; distance_mm: number | null; error: string | null } | undefined;

  if (!rij) return null;
  return { ts: rij.ts, afstandMm: rij.distance_mm, fout: rij.error };
}

/** De meest recente geslaagde meting — de laatste kan een foutrij zijn. */
export function laatsteGeslaagdeMeting(): Meting | null {
  const rij = getDb()
    .prepare(
      "SELECT ts, distance_mm FROM measurements " +
        "WHERE distance_mm IS NOT NULL ORDER BY ts DESC LIMIT 1",
    )
    .get() as { ts: number; distance_mm: number } | undefined;

  if (!rij) return null;
  return { ts: rij.ts, afstandMm: rij.distance_mm, fout: null };
}

export function haalVerloop(periode: PeriodeSleutel, nu?: number): Punt[] {
  const { duurSeconden, bucketSeconden } = PERIODES[periode];
  const vanaf = (nu ?? Math.floor(Date.now() / 1000)) - duurSeconden;

  const rijen = getDb()
    .prepare(
      // ts - (ts % ?) en niet (ts / ?) * ?: better-sqlite3 bindt JS-getallen als
      // REAL, waardoor de deling een kommadeling wordt en de vermenigvuldiging
      // gewoon ts teruggeeft — dan valt elke meting in haar eigen bucket. De
      // modulo-operator van SQLite cast zijn operanden eerst naar INTEGER en
      // doet dus wel wat hier nodig is.
      `SELECT ts - (ts % ?) AS bucket,
              AVG(distance_mm)                                   AS afstand,
              SUM(CASE WHEN error IS NOT NULL THEN 1 ELSE 0 END) AS fouten
         FROM measurements
        WHERE ts >= ?
        GROUP BY bucket
        ORDER BY bucket`,
    )
    .all(bucketSeconden, vanaf) as {
    bucket: number;
    afstand: number | null;
    fouten: number;
  }[];

  return rijen.map((r) => ({
    ts: r.bucket,
    afstandMm: r.afstand === null ? null : Math.round(r.afstand),
    fouten: r.fouten,
  }));
}

/**
 * De laatste geslaagde meting op of voor een tijdstip. Gebruikt om het verschil
 * over de voorbije dag te tonen: vult de put aan of loopt ze leeg?
 */
export function metingVoor(doelTs: number): Meting | null {
  const rij = getDb()
    .prepare(
      "SELECT ts, distance_mm FROM measurements " +
        "WHERE distance_mm IS NOT NULL AND ts <= ? ORDER BY ts DESC LIMIT 1",
    )
    .get(doelTs) as { ts: number; distance_mm: number } | undefined;

  if (!rij) return null;
  return { ts: rij.ts, afstandMm: rij.distance_mm, fout: null };
}
