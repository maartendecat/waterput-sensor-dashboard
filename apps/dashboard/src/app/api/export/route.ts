import { bestandsnaam, naarCsv } from "@/lib/csv";
import { isPeriodeSleutel, PERIODES } from "@/lib/periodes";
import { verloopMetNiveau } from "@/lib/verloop";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const periode = searchParams.get("periode") ?? "24u";

  if (!isPeriodeSleutel(periode)) {
    return new Response(
      `Onbekende periode. Kies uit: ${Object.keys(PERIODES).join(", ")}\n`,
      { status: 400, headers: { "Content-Type": "text/plain; charset=utf-8" } },
    );
  }

  const csv = naarCsv(verloopMetNiveau(periode));

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${bestandsnaam(periode)}"`,
      "Cache-Control": "no-store",
    },
  });
}
