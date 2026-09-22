import { config } from "./config";
import { Sensor } from "./sensor";
import { Verzender, type Meting } from "./verzender";

const sensor = new Sensor();
const verzender = new Verzender();

let stoppen = false;

/**
 * Lijnt het volgende moment uit op een veelvoud van het interval, zodat de
 * tijdstempels netjes op 00, 05, 10 ... vallen. Dat maakt de buckets in de
 * grafiek regelmatig, ook na een herstart.
 */
function volgendMomentMs(): number {
  const intervalMs = config.intervalSeconden * 1000;
  const nu = Date.now();
  return Math.ceil((nu + 1) / intervalMs) * intervalMs;
}

async function meetEenmaal(): Promise<void> {
  const ts = Math.round(Date.now() / 1000);
  let meting: Meting;

  try {
    const afstand = await sensor.leesAfstandMm();
    meting = { ts, distanceMm: afstand, error: null };
    console.log(`[poller] ${afstand} mm`);
  } catch (fout) {
    const bericht = (fout as Error).message || String(fout);
    meting = { ts, distanceMm: null, error: bericht };
    console.error(`[poller] uitlezen mislukt: ${bericht}`);

    // Poort dichtgooien zodat de volgende ronde opnieuw verbindt.
    await sensor.herstel().catch(() => undefined);
  }

  verzender.aanbieden(meting);
  const gelukt = await verzender.spoel();

  if (!gelukt && verzender.wachtrij > 0) {
    console.warn(`[poller] ${verzender.wachtrij} meting(en) in de wachtrij`);
  }
}

async function lus(): Promise<void> {
  // Meteen een eerste meting, zodat een herstart direct zichtbaar is.
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

  // Laatste kans om de buffer kwijt te raken.
  await verzender.spoel().catch(() => undefined);
  await sensor.sluit().catch(() => undefined);
  process.exit(0);
}

process.on("SIGTERM", () => void afsluiten("SIGTERM"));
process.on("SIGINT", () => void afsluiten("SIGINT"));

console.log(
  `[poller] start — poort ${config.poort}, register ${config.register}, ` +
    `elke ${config.intervalSeconden} s, dashboard ${config.dashboardUrl}`,
);

if (!config.ingestToken) {
  console.warn(
    "[poller] INGEST_TOKEN is niet gezet; de ingest-endpoint staat open.",
  );
}

void lus();
