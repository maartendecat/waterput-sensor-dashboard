import { config } from "./config";

export type Meting = {
  ts: number;
  distanceMm: number | null;
  error: string | null;
};

/**
 * Houdt metingen vast die nog niet zijn doorgegeven. Een herstart van het
 * dashboard mag geen meting kosten; een herstart van de poller zelf wel — dat
 * gebeurt zelden, en elke meting draagt haar eigen tijdstempel, dus laat
 * aankomen is onschuldig.
 */
export class Verzender {
  private buffer: Meting[] = [];

  aanbieden(meting: Meting): void {
    this.buffer.push(meting);

    if (this.buffer.length > config.bufferMax) {
      const weg = this.buffer.length - config.bufferMax;
      this.buffer.splice(0, weg);
      console.warn(`[verzender] buffer vol, ${weg} oudste meting(en) weggegooid`);
    }
  }

  get wachtrij(): number {
    return this.buffer.length;
  }

  /** Probeert de hele buffer door te geven. Bij mislukking blijft ze staan. */
  async spoel(): Promise<boolean> {
    if (this.buffer.length === 0) return true;

    const teVerzenden = [...this.buffer];

    try {
      const antwoord = await fetch(`${config.dashboardUrl}/api/measurements`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(config.ingestToken
            ? { Authorization: `Bearer ${config.ingestToken}` }
            : {}),
        },
        body: JSON.stringify({ readings: teVerzenden }),
        signal: AbortSignal.timeout(10_000),
      });

      if (!antwoord.ok) {
        const tekst = await antwoord.text().catch(() => "");
        console.error(
          `[verzender] dashboard antwoordde ${antwoord.status}: ${tekst.slice(0, 200)}`,
        );
        return false;
      }

      // Enkel wat we effectief hebben opgestuurd verdwijnt uit de buffer;
      // een meting die ondertussen binnenkwam blijft staan.
      this.buffer = this.buffer.slice(teVerzenden.length);

      if (teVerzenden.length > 1) {
        console.log(`[verzender] ${teVerzenden.length} gebufferde metingen doorgegeven`);
      }
      return true;
    } catch (fout) {
      console.error(`[verzender] versturen mislukt: ${(fout as Error).message}`);
      return false;
    }
  }
}
