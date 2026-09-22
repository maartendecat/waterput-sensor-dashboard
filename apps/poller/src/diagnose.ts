/**
 * Een mislukte uitlezing zegt op zich weinig; het verschil tussen "geen
 * antwoord" en "corrupt antwoord" bepaalt waar je gaat zoeken. Deze module
 * vertaalt de fout naar de raad die in PROJECT-DESIGN.md bij die faalmodus
 * hoort, zodat die raad in de log staat op het moment dat je hem nodig hebt.
 */
export type Soort =
  | "timeout"
  | "crc"
  | "modbus-exceptie"
  | "poort"
  | "bereik"
  | "onbekend";

export type Diagnose = {
  soort: Soort;
  bericht: string;
  raad: string;
};

export function diagnoseer(fout: unknown): Diagnose {
  const err = fout as { message?: string; name?: string; modbusCode?: number; code?: string };
  const bericht = err?.message || String(fout);
  const tekst = bericht.toLowerCase();

  if (typeof err?.modbusCode === "number") {
    return {
      soort: "modbus-exceptie",
      bericht,
      raad:
        `De sensor leeft en antwoordt, maar weigert dit verzoek (Modbus-code ${err.modbusCode}). ` +
        "Dat is goed nieuws voor de bedrading en slecht voor het adres: controleer " +
        "MODBUS_REGISTER en let op de verschuiving met één — datasheets tellen vaak " +
        "vanaf 1, de lijn telt vanaf 0.",
    };
  }

  if (tekst.includes("crc")) {
    return {
      soort: "crc",
      bericht,
      raad:
        "Er komt wel iets terug, maar beschadigd. Dat wijst op de lijn zelf: " +
        "controleer de baudrate (9600 8N1), de afscherming en of A en B niet " +
        "half verwisseld zijn. Een enkele CRC-fout is ruis, een aanhoudende reeks niet.",
    };
  }

  if (err?.code === "ENOENT" || err?.code === "ENXIO" || err?.code === "ENODEV" || tekst.includes("port not open") || tekst.includes("cannot open")) {
    return {
      soort: "poort",
      bericht,
      raad:
        "De seriële poort is niet beschikbaar. Zit de USB-adapter er nog in, en klopt " +
        "de devices-mapping in docker-compose.yml? Controleer op de host met " +
        "ls -l /dev/serial/by-id/. Houdt Home Assistant de poort nog vast, dan is dit " +
        "de verwachte fout.",
    };
  }

  if (tekst.includes("timed out") || tekst.includes("timeout")) {
    return {
      soort: "timeout",
      bericht,
      raad:
        "Geen antwoord van de sensor. Wissel eerst A en B om — dat is veruit de " +
        "vaakste oorzaak. Controleer daarna de 5 V op de sensor (is de polyfuse " +
        "afgeslagen?), de massaverbinding en het slave-adres.",
    };
  }

  return {
    soort: "onbekend",
    bericht,
    raad: "Geen bekend patroon. De volledige foutmelding staat hierboven.",
  };
}

/** Een antwoord dat aankomt maar niet kan kloppen. */
export function buitenBereik(
  afstandMm: number,
  minMm: number,
  maxMm: number,
): Diagnose | null {
  if (afstandMm >= minMm && afstandMm <= maxMm) return null;

  const raad =
    afstandMm < minMm
      ? `Dit ligt in of onder de dode zone (0–${minMm} mm). Een 0 betekent bij een ` +
        "ultrasone sensor meestal dat de echo niet is teruggekomen — golfslag, schuim, " +
        "of iets voor de transducer. Staat het water echt zo hoog, dan hangt de sensor te laag."
      : `Dit ligt boven het meetbereik van ${maxMm} mm. De echo haalt de bodem niet, ` +
        "of er is geen wateroppervlak meer om op te weerkaatsen.";

  return {
    soort: "bereik",
    bericht: `Onwaarschijnlijke meting: ${afstandMm} mm`,
    raad,
  };
}
