import Link from "next/link";
import { AutoVernieuwen } from "@/components/AutoVernieuwen";
import { Meter } from "@/components/Meter";
import { VerloopKaart } from "@/components/VerloopKaart";
import { leesConfiguratie } from "@/lib/config";
import { formatteerGetal, relatieveTijd } from "@/lib/format";
import { laatsteGeslaagdeMeting, laatsteMeting, metingVoor } from "@/lib/history";
import { berekenNiveau } from "@/lib/level";
import { verloopMetNiveau } from "@/lib/verloop";

export const dynamic = "force-dynamic";

/** Na drie gemiste polls (15 min) gaan we ervan uit dat er iets scheelt. */
const VEROUDERD_NA_SECONDEN = 20 * 60;

export default function Hoofdpagina() {
  const config = leesConfiguratie();
  const laatste = laatsteMeting();
  const laatsteGoed = laatsteGeslaagdeMeting();
  const punten = verloopMetNiveau("24u");
  const nu = Math.floor(Date.now() / 1000);

  const niveau =
    config && laatsteGoed?.afstandMm != null
      ? berekenNiveau(laatsteGoed.afstandMm, config)
      : null;

  // Verschil met een dag geleden — vult de put aan of loopt ze leeg?
  const dagGeleden = metingVoor(nu - 86_400);
  const niveauToen =
    config && dagGeleden?.afstandMm != null
      ? berekenNiveau(dagGeleden.afstandMm, config)
      : null;
  const verschilLiter =
    niveau && niveauToen ? niveau.liter - niveauToen.liter : null;

  const verouderd =
    laatste !== null && nu - laatste.ts > VEROUDERD_NA_SECONDEN;

  return (
    <>
      <header className="kop">
        <h1>Regenwaterput</h1>
        <nav>
          <Link href="/configuratie">Configuratie</Link>
        </nav>
      </header>

      {!config && (
        <p className="melding waarschuwing">
          <strong>Nog niet gekalibreerd.</strong> Zonder de afstanden bij een
          volle en lege put kan het peil niet in procent of liter worden
          uitgedrukt. Vul ze in op de{" "}
          <Link href="/configuratie">configuratiepagina</Link>.
        </p>
      )}

      {laatste === null && (
        <p className="melding waarschuwing">
          <strong>Nog geen metingen ontvangen.</strong> Controleer of de poller
          draait en de sensor kan uitlezen.
        </p>
      )}

      {verouderd && laatste && (
        <p className="melding ernstig">
          <strong>De metingen lopen achter.</strong> De laatste binnenkomst was{" "}
          {relatieveTijd(laatste.ts, nu)}, terwijl er om de vijf minuten een
          meting hoort te komen.
        </p>
      )}

      {laatste?.fout && !verouderd && (
        <p className="melding ernstig">
          <strong>De laatste uitlezing mislukte.</strong> {laatste.fout}
        </p>
      )}

      {niveau?.buitenBereik === "boven" && (
        <p className="melding waarschuwing">
          <strong>Boven het gekalibreerde bereik.</strong> De sensor meet een
          kleinere afstand dan die bij een volle put — de put loopt over, of de
          kalibratie klopt niet.
        </p>
      )}

      {niveau?.buitenBereik === "onder" && (
        <p className="melding ernstig">
          <strong>Onder het gekalibreerde bereik.</strong> De sensor meet een
          grotere afstand dan die bij een lege put.
        </p>
      )}

      <section className="kaart">
        <div className="peil">
          <div className="peil-cijfers">
            {niveau ? (
              <>
                <p className="hoofdcijfer">
                  {formatteerGetal(niveau.percentage)}
                  <span>&thinsp;%</span>
                </p>
                <p className="onderschrift">
                  {formatteerGetal(niveau.liter)} van{" "}
                  {formatteerGetal(config!.volumeLiter)} liter
                </p>
              </>
            ) : (
              <>
                <p className="hoofdcijfer">
                  {laatsteGoed?.afstandMm != null
                    ? formatteerGetal(laatsteGoed.afstandMm)
                    : "—"}
                  <span>&thinsp;mm</span>
                </p>
                <p className="onderschrift">
                  Ruwe afstand tot het wateroppervlak.
                </p>
              </>
            )}

            <div className="tegels">
              <div>
                <p className="tegel-label">Afstand tot water</p>
                <p className="tegel-waarde">
                  {laatsteGoed?.afstandMm != null
                    ? `${formatteerGetal(laatsteGoed.afstandMm)} mm`
                    : "—"}
                </p>
              </div>
              <div>
                <p className="tegel-label">Laatste meting</p>
                <p className="tegel-waarde">
                  {laatste ? relatieveTijd(laatste.ts, nu) : "—"}
                </p>
              </div>
              {verschilLiter !== null && (
                <div>
                  <p className="tegel-label">Verschil met gisteren</p>
                  <p className="tegel-waarde">
                    {verschilLiter >= 0 ? "+" : "\u2212"}
                    {formatteerGetal(Math.abs(verschilLiter))} l
                  </p>
                </div>
              )}
            </div>
          </div>

          <Meter fractie={niveau ? niveau.fractie : 0} />
        </div>
      </section>

      <VerloopKaart beginPunten={punten} beginPeriode="24u" />

      <AutoVernieuwen />
    </>
  );
}
