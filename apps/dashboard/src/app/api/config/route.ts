import { NextResponse } from "next/server";
import {
  leesConfiguratie,
  schrijfConfiguratie,
  valideerConfiguratie,
} from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ configuratie: leesConfiguratie() });
}

export async function PUT(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ fouten: ["Ongeldige JSON"] }, { status: 400 });
  }

  const ruw = body as Record<string, unknown>;
  const invoer = {
    afstandVolMm: Number(ruw?.afstandVolMm),
    afstandLeegMm: Number(ruw?.afstandLeegMm),
    volumeLiter: Number(ruw?.volumeLiter),
  };

  const fouten = valideerConfiguratie(invoer);
  if (fouten.length > 0) {
    return NextResponse.json({ fouten }, { status: 400 });
  }

  schrijfConfiguratie(invoer);
  return NextResponse.json({ configuratie: invoer });
}
