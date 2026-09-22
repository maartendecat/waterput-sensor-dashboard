import { buitenBereik, diagnoseer, type Diagnose } from "./diagnose";
import { config } from "./config";
import { Sensor } from "./sensor";
import { Verzender, type Meting } from "./verzender";

const sensor = new Sensor();
const verzender = new Verzender();

let stoppen = false;

/** Loopt op bij elke mislukte uitlezing, terug naar nul zodra er een lukt. */
let opeenvolgendeFouten = 0;
let storingBegonTs: number | null = null;
let laatsteSoort: string | null = null;

function volgendMomentMs(): number {
  const intervalMs = config.intervalSeconden * 1000;
  return Math.ceil((Date.now() + 1) / intervalMs) * intervalMs;
}

function duurTekst(seconden: number): string {
  if (seconden < 90) return `${Math.round(seconden)} s`;
  if (seconden < 5400) return `${Math.round(seconden / 60)} min`;
  return `${(seconden / 3600).toFixed(1)} u`;
}

function meldStoring(diagnose: Diagnose, ts: number): void {
  opeenvolgendeFouten += 1;

  // De eerste fout van een reeks krijgt de volledige uitleg. Daarna alleen een
  // regel per poging, anders staat dezelfde raad 288 keer per dag in de log en
  // is hij niets meer waard.
  const nieuweStoring = opeenvolgendeFouten === 1 || diagnose.soort !== laatsteSoort;

  if (nieuweStoring) {
    if (storingBegonTs === null) storingBegonTs = ts;
    console.error(`[poller] uitlezen mislukt (${diagnose.soort}): ${diagnose.bericht}`);
    console.error(`[poller]   → ${diagnose.raad}`);
  } else {
    const duur = duurTekst(ts - (storingBegonTs ?? ts));
    console.error(
      `[poller] uitlezen mislukt (${diagnose.soort}), ` +
        `${opeenvolgendeFouten} op rij sinds ${duur} geleden`,
    );
  }

  laatsteSoort = diagnose.soort;
}

function meldHerstel(afstandMm: number, ts: number): void {
  if (opeenvolgendeFouten === 0) return;

  const duur = duurTekst(ts - (storingBegonTs ?? ts));
  console.log(
    `[poller] sensor werkt weer: ${afstandMm} mm, ` +
      `na ${opeenvolgendeFouten} mislukte poging(en) over ${duur}`,
  );

  opeenvolgendeFouten = 0;
  storingBegonTs = null;
  laatsteSoort = null;
}

async function meetEenmaal(): Promise<void> {
  const ts = Math.round(Date.now() / 1000);
  let meting: Meting;

  try {
    const afstand = await sensor.leesAfstandMm();

    // Een antwoord dat aankomt is nog geen geldige meting. Zonder deze controle
    // rekent een 0 mm door als een volle put: klein getal is veel water.
    const onzin = buitenBereik(afstand, config.minAfstandMm, config.maxAfstandMm);

    if (onzin) {
      meldStoring(onzin, ts);
      meting = { ts, distanceMm: null, error: onzin.bericht };
    } else {
      meldHerstel(afstand, ts);
      meting = { ts, distanceMm: afstand, error: null };
      console.log(`[poller] ${afstand} mm`);
    }
  } catch (fout) {
    const diagnose = diagnoseer(fout);
    meldStoring(diagnose, ts);
    meting = { ts, distanceMm: null, error: diagnose.bericht };

    // Poort dichtgooien zodat de volgende ronde opnieuw verbindt.
    await sensor.herstel().catch(() => undefined);
  }

  const wachtrijVoor = verzender.wachtrij;
  verzender.aanbieden(meting);
  const gelukt = await verzender.spoel();

  if (!gelukt && verzender.wachtrij > 0) {
    // Dit is een andere storing dan een stille sensor: de meting is er wel,
    // ze raakt alleen niet weg. De diepte van de wachtrij zegt hoe lang al.
    const dekking = duurTekst(verzender.wachtrij * config.intervalSeconden);
    console.warn(
      `[poller] dashboard onbereikbaar — ${verzender.wachtrij} meting(en) in de ` +
        `wachtrij (${dekking} aan gegevens, buffer houdt er ${config.bufferMax})`,
    );
  } else if (gelukt && wachtrijVoor > 1) {
    console.log("[poller] dashboard weer bereikbaar, wachtrij leeg");
  }
}

async function lus(): Promise<void> {
  await meetEenmaal();

  while (!stoppen) {
    const wachtMs = volgendMomentMs() - Date.now();
    await new Promise((resolve) => setTimeout(resolve, wachtMs));
    if (stoppen) break;
    await meetEenmaal();
  }
}

async function afsluiten(signaal: string): Promise<void> {
  console.log(`[poller] ${signaal} ontvangen, afsluiten`);
  stoppen = true;

  if (verzender.wachtrij > 0) {
    console.log(`[poller] nog ${verzender.wachtrij} meting(en) te versturen`);
  }

  await verzender.spoel().catch(() => undefined);
  await sensor.sluit().catch(() => undefined);
  process.exit(0);
}

process.on("SIGTERM", () => void afsluiten("SIGTERM"));
process.on("SIGINT", () => void afsluiten("SIGINT"));

console.log(
  `[poller] start — poort ${config.poort}, register ${config.register}, ` +
    `elke ${config.intervalSeconden} s, geldig bereik ` +
    `${config.minAfstandMm}-${config.maxAfstandMm} mm, dashboard ${config.dashboardUrl}`,
);

if (!config.ingestToken) {
  console.warn("[poller] INGEST_TOKEN is niet gezet; de ingest-endpoint staat open.");
}

void lus();
