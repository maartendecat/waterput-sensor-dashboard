import { NextResponse } from "next/server";
import { isPeriodeSleutel, PERIODES } from "@/lib/periodes";
import { verloopMetNiveau } from "@/lib/verloop";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const periode = searchParams.get("periode") ?? "24u";

  if (!isPeriodeSleutel(periode)) {
    return NextResponse.json(
      { fout: `Onbekende periode. Kies uit: ${Object.keys(PERIODES).join(", ")}` },
      { status: 400 },
    );
  }

  return NextResponse.json({ periode, punten: verloopMetNiveau(periode) });
}
