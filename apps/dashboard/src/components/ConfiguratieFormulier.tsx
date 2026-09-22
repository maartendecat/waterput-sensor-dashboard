"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { Configuratie } from "@/lib/level";

type Velden = { afstandVolMm: string; afstandLeegMm: string; volumeLiter: string };

export function ConfiguratieFormulier({
  beginwaarden,
}: {
  beginwaarden: Configuratie | null;
}) {
  const router = useRouter();

  const [velden, setVelden] = useState<Velden>({
    afstandVolMm: beginwaarden ? String(beginwaarden.afstandVolMm) : "",
    afstandLeegMm: beginwaarden ? String(beginwaarden.afstandLeegMm) : "",
    volumeLiter: beginwaarden ? String(beginwaarden.volumeLiter) : "",
  });
  const [fouten, setFouten] = useState<string[]>([]);
  const [opgeslagen, setOpgeslagen] = useState(false);
  const [bezig, setBezig] = useState(false);

  function wijzig(naam: keyof Velden, waarde: string) {
    setVelden((v) => ({ ...v, [naam]: waarde }));
    setOpgeslagen(false);
  }

  async function verstuur(e: FormEvent) {
    e.preventDefault();
    setBezig(true);
    setFouten([]);
    setOpgeslagen(false);

    try {
      const antwoord = await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          afstandVolMm: Number(velden.afstandVolMm),
          afstandLeegMm: Number(velden.afstandLeegMm),
          volumeLiter: Number(velden.volumeLiter),
        }),
      });

      const data = (await antwoord.json()) as { fouten?: string[] };

      if (!antwoord.ok) {
        setFouten(data.fouten ?? ["Opslaan mislukt."]);
        return;
      }

      setOpgeslagen(true);
      // De hoofdpagina rekent serverzijdig om, dus die cache moet weg.
      router.refresh();
    } catch {
      setFouten(["De server is niet bereikbaar."]);
    } finally {
      setBezig(false);
    }
  }

  return (
    <form onSubmit={verstuur} noValidate>
      {fouten.length > 0 && (
        <div className="melding ernstig">
          <ul className="fouten">
            {fouten.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>
      )}

      {opgeslagen && (
        <p className="melding goed">
          <strong>Opgeslagen.</strong> De omrekening gebruikt meteen de nieuwe
          waarden, ook voor de historiek.
        </p>
      )}

      <div className="veld">
        <label htmlFor="afstandVolMm">Afstand bij volle put</label>
        <p className="hulp">
          Wat de sensor meet wanneer de put tot het maximumpeil staat. Dit is de
          kleinste afstand die je verwacht.
        </p>
        <input
          id="afstandVolMm"
          name="afstandVolMm"
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          value={velden.afstandVolMm}
          onChange={(e) => wijzig("afstandVolMm", e.target.value)}
        />
        <span className="eenheid">mm</span>
      </div>

      <div className="veld">
        <label htmlFor="afstandLeegMm">Afstand bij lege put</label>
        <p className="hulp">
          Wat de sensor meet wanneer de put op het minimumpeil staat — het punt
          waarop je hem als leeg beschouwt, niet noodzakelijk de bodem.
        </p>
        <input
          id="afstandLeegMm"
          name="afstandLeegMm"
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          value={velden.afstandLeegMm}
          onChange={(e) => wijzig("afstandLeegMm", e.target.value)}
        />
        <span className="eenheid">mm</span>
      </div>

      <div className="veld">
        <label htmlFor="volumeLiter">Inhoud tussen beide peilen</label>
        <p className="hulp">
          Het volume dat tussen die twee afstanden zit. Dit is wat 100 % waard
          is in liter.
        </p>
        <input
          id="volumeLiter"
          name="volumeLiter"
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          value={velden.volumeLiter}
          onChange={(e) => wijzig("volumeLiter", e.target.value)}
        />
        <span className="eenheid">liter</span>
      </div>

      <button type="submit" className="primair" disabled={bezig}>
        {bezig ? "Bezig…" : "Opslaan"}
      </button>
    </form>
  );
}
