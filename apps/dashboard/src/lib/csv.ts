import { TIJDZONE } from "./format";
import type { PeriodeSleutel } from "./periodes";
import type { VerloopPunt } from "./verloop";

/**
 * Puntkomma's en komma-decimalen: dat is wat Excel in een Belgische
 * regio-instelling verwacht bij dubbelklikken. Een RFC4180-bestand met
 * punt-decimalen komt daar in één kolom binnen.
 */
const SCHEIDING = ";";

const KOPPEN = [
  "unix_ts",
  "tijdstip",
  "vulniveau_procent",
  "inhoud_liter",
  "afstand_mm",
] as const;

function veld(waarde: string): string {
  // Getallen en datums bevatten dit nooit, maar een exportfunctie die er niet
  // tegen kan is een wachtende bug.
  if (!/[";\r\n]/.test(waarde)) return waarde;
  return `"${waarde.replace(/"/g, '""')}"`;
}

function komma(waarde: number, decimalen: number): string {
  return waarde.toFixed(decimalen).replace(".", ",");
}

/** "2026-09-22 13:20" in Europe/Brussels — zo leest Excel het als een tijdstip. */
function lokaleTijd(ts: number): string {
  const delen = new Intl.DateTimeFormat("sv-SE", {
    timeZone: TIJDZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(ts * 1000));

  // sv-SE levert al "2026-09-22 13:20"; normaliseer een eventuele T.
  return delen.replace("T", " ");
}

export function naarCsv(punten: VerloopPunt[]): string {
  const regels = [KOPPEN.join(SCHEIDING)];

  for (const punt of punten) {
    regels.push(
      [
        String(punt.ts),
        lokaleTijd(punt.ts),
        punt.percentage === null ? "" : komma(punt.percentage, 1),
        punt.liter === null ? "" : komma(punt.liter, 0),
        punt.afstandMm === null ? "" : String(punt.afstandMm),
      ]
        .map(veld)
        .join(SCHEIDING),
    );
  }

  // BOM, anders toont Excel UTF-8 als latin-1.
  return "﻿" + regels.join("\r\n") + "\r\n";
}

export function bestandsnaam(periode: PeriodeSleutel, nu = new Date()): string {
  const datum = new Intl.DateTimeFormat("sv-SE", {
    timeZone: TIJDZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(nu);

  return `waterput-${periode}-${datum}.csv`;
}
