import Link from "next/link";
import { ConfiguratieFormulier } from "@/components/ConfiguratieFormulier";
import { leesConfiguratie } from "@/lib/config";
import { formatteerGetal } from "@/lib/format";
import { laatsteGeslaagdeMeting } from "@/lib/history";

export const dynamic = "force-dynamic";

export default function ConfiguratiePagina() {
  const config = leesConfiguratie();
  const laatsteGoed = laatsteGeslaagdeMeting();

  return (
    <>
      <header className="kop">
        <h1>Configuratie</h1>
        <nav>
          <Link href="/">Terug naar het overzicht</Link>
        </nav>
      </header>

      <p className="melding">
        De sensor hangt aan het plafond van de put en meet de afstand naar
        beneden tot het wateroppervlak. <strong>Veel water is dus een kleine
        afstand.</strong> Kalibreren doe je door de waarde af te lezen bij een
        volle en bij een lege put.
        {laatsteGoed?.afstandMm != null && (
          <>
            {" "}
            De sensor meet op dit moment{" "}
            <strong>{formatteerGetal(laatsteGoed.afstandMm)} mm</strong>.
          </>
        )}
      </p>

      <section className="kaart">
        <ConfiguratieFormulier beginwaarden={config} />
      </section>

      <p className="melding">
        De omrekening gebeurt bij het tonen, niet bij het opslaan: de database
        bewaart enkel de ruwe millimeters. Je mag deze waarden dus later
        bijstellen zonder dat je historiek onbruikbaar wordt.
      </p>
    </>
  );
}
