"use client";

import { useState } from "react";
import { Grafiek, type GrafiekPunt } from "./Grafiek";
import { formatteerBucket, formatteerGetal } from "@/lib/format";
import { PERIODES, type PeriodeSleutel } from "@/lib/periodes";

export function VerloopKaart({
  beginPunten,
  beginPeriode,
}: {
  beginPunten: GrafiekPunt[];
  beginPeriode: PeriodeSleutel;
}) {
  const [periode, setPeriode] = useState<PeriodeSleutel>(beginPeriode);
  const [punten, setPunten] = useState<GrafiekPunt[]>(beginPunten);
  const [laadt, setLaadt] = useState(false);
  const [toonTabel, setToonTabel] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  async function kies(nieuw: PeriodeSleutel) {
    if (nieuw === periode) return;

    setPeriode(nieuw);
    setLaadt(true);
    setFout(null);

    try {
      const antwoord = await fetch(`/api/history?periode=${nieuw}`, {
        cache: "no-store",
      });
      if (!antwoord.ok) throw new Error("Ophalen mislukt");
      const data = (await antwoord.json()) as { punten: GrafiekPunt[] };
      // De vorige render blijft staan tot de nieuwe binnen is — geen skelet,
      // geen sprong in de hoogte.
      setPunten(data.punten);
    } catch {
      setFout("De gegevens voor deze periode konden niet worden opgehaald.");
    } finally {
      setLaadt(false);
    }
  }

  return (
    <section className="kaart">
      <div className="kaart-kop">
        <h2 className="kaart-titel">Vulniveau in procent</h2>
        <div className="periodes" role="group" aria-label="Periode">
          {(Object.keys(PERIODES) as PeriodeSleutel[]).map((sleutel) => (
            <button
              key={sleutel}
              type="button"
              aria-pressed={sleutel === periode}
              onClick={() => kies(sleutel)}
            >
              {PERIODES[sleutel].label}
            </button>
          ))}
        </div>
      </div>

      {fout && <p className="melding ernstig">{fout}</p>}

      <Grafiek punten={punten} periode={periode} vervaagd={laadt} />

      <button
        type="button"
        className="schakelaar"
        aria-expanded={toonTabel}
        onClick={() => setToonTabel((v) => !v)}
      >
        {toonTabel ? "Tabel verbergen" : "Tabel tonen"}
      </button>

      {toonTabel && (
        <div className="tabel-omhulsel">
          <table className="verloop">
            <caption className="visueel-verborgen">
              Metingen over de laatste {PERIODES[periode].label}
            </caption>
            <thead>
              <tr>
                <th scope="col">Tijdstip</th>
                <th scope="col">Vulniveau</th>
                <th scope="col">Inhoud</th>
                <th scope="col">Afstand</th>
              </tr>
            </thead>
            <tbody>
              {[...punten].reverse().map((punt) => (
                <tr key={punt.ts}>
                  <td>{formatteerBucket(punt.ts, periode)}</td>
                  <td>
                    {punt.percentage === null
                      ? "—"
                      : `${formatteerGetal(punt.percentage)} %`}
                  </td>
                  <td>
                    {punt.liter === null ? "—" : `${formatteerGetal(punt.liter)} l`}
                  </td>
                  <td>
                    {punt.afstandMm === null
                      ? "geen meting"
                      : `${formatteerGetal(punt.afstandMm)} mm`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
