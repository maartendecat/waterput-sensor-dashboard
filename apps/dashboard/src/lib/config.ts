import { getDb } from "./db";
import type { Configuratie } from "./level";

const SLEUTELS = ["afstandVolMm", "afstandLeegMm", "volumeLiter"] as const;
type Sleutel = (typeof SLEUTELS)[number];

export function leesConfiguratie(): Configuratie | null {
  const db = getDb();
  const rijen = db
    .prepare("SELECT key, value FROM config")
    .all() as { key: string; value: string }[];

  const kaart = new Map(rijen.map((r) => [r.key, Number(r.value)]));

  for (const sleutel of SLEUTELS) {
    const waarde = kaart.get(sleutel);
    if (waarde === undefined || !Number.isFinite(waarde)) return null;
  }

  return {
    afstandVolMm: kaart.get("afstandVolMm")!,
    afstandLeegMm: kaart.get("afstandLeegMm")!,
    volumeLiter: kaart.get("volumeLiter")!,
  };
}

export function schrijfConfiguratie(config: Configuratie): void {
  const db = getDb();
  const stmt = db.prepare(
    "INSERT INTO config (key, value) VALUES (?, ?) " +
      "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
  );

  const schrijfAlles = db.transaction((c: Configuratie) => {
    for (const sleutel of SLEUTELS) {
      stmt.run(sleutel, String(c[sleutel as Sleutel]));
    }
  });

  schrijfAlles(config);
}

/** Geeft een lijst met Nederlandse foutmeldingen terug; leeg betekent geldig. */
export function valideerConfiguratie(invoer: Partial<Configuratie>): string[] {
  const fouten: string[] = [];
  const { afstandVolMm, afstandLeegMm, volumeLiter } = invoer;

  for (const [naam, waarde] of [
    ["Afstand bij volle put", afstandVolMm],
    ["Afstand bij lege put", afstandLeegMm],
    ["Inhoud", volumeLiter],
  ] as const) {
    if (waarde === undefined || !Number.isFinite(waarde)) {
      fouten.push(`${naam} moet een getal zijn.`);
    } else if (waarde <= 0) {
      fouten.push(`${naam} moet groter zijn dan nul.`);
    }
  }

  if (fouten.length > 0) return fouten;

  if (afstandVolMm! >= afstandLeegMm!) {
    fouten.push(
      "De afstand bij een volle put moet kleiner zijn dan bij een lege put — " +
        "de sensor meet naar beneden, dus meer water betekent een kleinere afstand.",
    );
  }

  // De sensor heeft een bereik van 5 m en een dode zone vlak onder de kop.
  if (afstandLeegMm! > 5000) {
    fouten.push("De sensor meet tot 5000 mm; een grotere afstand kan hij niet zien.");
  }
  if (afstandVolMm! < 250) {
    fouten.push(
      "Binnen 250 mm van de sensor ligt de dode zone; een volle put moet daar onder blijven.",
    );
  }

  return fouten;
}
