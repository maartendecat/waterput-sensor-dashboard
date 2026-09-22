import type { PeriodeSleutel } from "./periodes";

const NL = "nl-BE";

/**
 * Vast, niet uit process.env: de server en de browser moeten exact dezelfde
 * string produceren, anders klaagt React over hydratie.
 */
export const TIJDZONE = "Europe/Brussels";

export function formatteerGetal(waarde: number, decimalen = 0): string {
  return new Intl.NumberFormat(NL, {
    minimumFractionDigits: decimalen,
    maximumFractionDigits: decimalen,
  }).format(waarde);
}

export function formatteerTijdstip(ts: number): string {
  return new Intl.DateTimeFormat(NL, {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: TIJDZONE,
  }).format(new Date(ts * 1000));
}

/** "3 minuten geleden", "2 uur geleden", ... */
export function relatieveTijd(ts: number, nu: number = Date.now() / 1000): string {
  const seconden = Math.max(0, Math.round(nu - ts));

  if (seconden < 60) return "zojuist";

  const eenheden: [number, Intl.RelativeTimeFormatUnit][] = [
    [60, "minute"],
    [3600, "hour"],
    [86400, "day"],
  ];

  let gekozen: [number, Intl.RelativeTimeFormatUnit] = eenheden[0];
  for (const eenheid of eenheden) {
    if (seconden >= eenheid[0]) gekozen = eenheid;
  }

  const formatter = new Intl.RelativeTimeFormat(NL, { numeric: "auto" });
  return formatter.format(-Math.round(seconden / gekozen[0]), gekozen[1]);
}

/**
 * Het label van een bucket. Dagbuckets liggen op UTC-middernacht — eenvoudig
 * en immuun voor zomertijd, maar daardoor begint een "dag" hier om 02:00
 * lokale tijd. Voor de jaargrafiek tonen we dus enkel de datum: het gemiddelde
 * gaat over een dag, niet over een tijdstip.
 */
export function formatteerBucket(ts: number, periode: PeriodeSleutel): string {
  const opties: Intl.DateTimeFormatOptions =
    periode === "12m"
      ? { dateStyle: "short" }
      : { dateStyle: "short", timeStyle: "short" };

  return new Intl.DateTimeFormat(NL, { ...opties, timeZone: TIJDZONE }).format(
    new Date(ts * 1000),
  );
}
