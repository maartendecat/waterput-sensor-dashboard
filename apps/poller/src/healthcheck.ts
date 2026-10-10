import { config } from "./config";

/**
 * Meldt elke ronde aan Healthchecks.io (of een dienst met dezelfde
 * ping-API) of de meting in de database is geraakt.
 *
 * Het alarm zelf komt van buitenaf: blijven de pings weg, dan verwittigt
 * Healthchecks na de grace-periode. Zo valt ook een poller die gecrasht is of
 * een Pi zonder stroom op — precies de storingen waarbij niemand hier nog iets
 * kan melden.
 */
export class Healthcheck {
  /** Rondes op rij die niet in de database zijn geraakt. */
  private slechteRondes = 0;
  private onbereikbaar = false;

  /** Meting gelukt én afgeleverd. */
  async gezond(): Promise<void> {
    this.slechteRondes = 0;
    await this.ping("", "");
  }

  /**
   * Eén slechte ronde is ruis en komt enkel in het logboek van de check. Pas
   * vanaf `healthcheckFoutenVoorAlarm` op rij gaat de check op "down", met de
   * reden in de melding.
   */
  async ongezond(reden: string): Promise<void> {
    this.slechteRondes += 1;
    const alarm = this.slechteRondes >= config.healthcheckFoutenVoorAlarm;
    const tekst = `${this.slechteRondes} ronde(s) op rij mislukt\n\n${reden}`;
    await this.ping(alarm ? "/fail" : "/log", tekst);
  }

  private async ping(pad: string, tekst: string): Promise<void> {
    if (!config.healthcheckUrl) return;

    try {
      const antwoord = await fetch(`${config.healthcheckUrl}${pad}`, {
        method: "POST",
        headers: { "Content-Type": "text/plain; charset=utf-8" },
        body: tekst,
        signal: AbortSignal.timeout(10_000),
      });
      if (!antwoord.ok) throw new Error(`HTTP ${antwoord.status}`);

      if (this.onbereikbaar) {
        console.log("[healthcheck] weer bereikbaar");
        this.onbereikbaar = false;
      }
    } catch (fout) {
      // Geen internet hoort Healthchecks zelf al als stilte. Hier volstaat één
      // regel per storing in plaats van één per ronde.
      if (!this.onbereikbaar) {
        console.warn(`[healthcheck] ping mislukt: ${(fout as Error).message}`);
        this.onbereikbaar = true;
      }
    }
  }
}
