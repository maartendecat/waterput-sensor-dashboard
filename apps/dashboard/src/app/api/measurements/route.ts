import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type BinnenkomendeMeting = {
  ts: number;
  distanceMm: number | null;
  error: string | null;
};

function tokenKlopt(header: string | null): boolean {
  const verwacht = process.env.INGEST_TOKEN;

  // Zonder ingesteld token is de endpoint open. Dat is een bewuste keuze voor
  // een opstelling die enkel op het LAN hangt, maar het is niet de bedoeling.
  if (!verwacht) return true;
  if (!header?.startsWith("Bearer ")) return false;

  const geleverd = Buffer.from(header.slice("Bearer ".length));
  const juist = Buffer.from(verwacht);

  // timingSafeEqual eist gelijke lengtes, en de lengte zelf lekt sowieso.
  if (geleverd.length !== juist.length) return false;
  return timingSafeEqual(geleverd, juist);
}

function parseerMeting(ruw: unknown): BinnenkomendeMeting | null {
  if (typeof ruw !== "object" || ruw === null) return null;
  const m = ruw as Record<string, unknown>;

  if (typeof m.ts !== "number" || !Number.isFinite(m.ts)) return null;

  const afstand = m.distanceMm;
  const fout = m.error;

  const afstandGeldig =
    afstand === null ||
    afstand === undefined ||
    (typeof afstand === "number" && Number.isFinite(afstand) && afstand >= 0);
  if (!afstandGeldig) return null;

  if (fout !== null && fout !== undefined && typeof fout !== "string") return null;

  return {
    ts: Math.floor(m.ts),
    distanceMm:
      typeof afstand === "number" ? Math.round(afstand) : null,
    error: typeof fout === "string" ? fout.slice(0, 500) : null,
  };
}

export async function POST(request: Request) {
  if (!tokenKlopt(request.headers.get("authorization"))) {
    return NextResponse.json({ fout: "Ongeldig token" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ fout: "Ongeldige JSON" }, { status: 400 });
  }

  const lijst = (body as { readings?: unknown })?.readings;
  if (!Array.isArray(lijst)) {
    return NextResponse.json(
      { fout: "Verwacht een object met een array 'readings'" },
      { status: 400 },
    );
  }

  const metingen: BinnenkomendeMeting[] = [];
  for (const ruw of lijst) {
    const meting = parseerMeting(ruw);
    if (!meting) {
      return NextResponse.json(
        { fout: "Een van de metingen heeft een ongeldige vorm" },
        { status: 400 },
      );
    }
    metingen.push(meting);
  }

  const db = getDb();
  const stmt = db.prepare(
    "INSERT OR IGNORE INTO measurements (ts, distance_mm, error) VALUES (?, ?, ?)",
  );

  // Alles in een transactie: de poller stuurt bij een herstelde verbinding
  // zijn hele buffer in een keer op.
  const schrijfAlles = db.transaction((rijen: BinnenkomendeMeting[]) => {
    let nieuw = 0;
    for (const r of rijen) {
      nieuw += stmt.run(r.ts, r.distanceMm, r.error).changes;
    }
    return nieuw;
  });

  const opgeslagen = schrijfAlles(metingen);

  return NextResponse.json({
    ontvangen: metingen.length,
    opgeslagen,
  });
}
