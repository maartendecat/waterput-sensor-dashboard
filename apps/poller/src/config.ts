function getal(naam: string, standaard: number): number {
  const ruw = process.env[naam];
  if (ruw === undefined || ruw === "") return standaard;

  const waarde = Number(ruw);
  if (!Number.isFinite(waarde)) {
    throw new Error(`${naam} moet een getal zijn, kreeg "${ruw}"`);
  }
  return waarde;
}

export const config = {
  poort: process.env.MODBUS_PORT ?? "/dev/ttyUSB0",
  baudrate: getal("MODBUS_BAUDRATE", 9600),
  slaveId: getal("MODBUS_SLAVE_ID", 1),

  /**
   * 0x0100 = 256, de gefilterde afstand. Het ongefilterde register (0x0101)
   * reageert sneller, maar het peil van een regenwaterput heeft niets te
   * zoeken in een update sneller dan om de paar minuten.
   */
  register: getal("MODBUS_REGISTER", 256),

  timeoutMs: getal("MODBUS_TIMEOUT_MS", 2000),

  /**
   * Grenzen waarbinnen een meting fysiek mogelijk is: de sensor meet vanaf
   * 200 mm tot 5 m. Dit is de sensorspecificatie, niet de montagemarge van
   * 25 cm uit PROJECT-DESIGN.md -- die laatste zegt hoe hoog je de sensor
   * ophangt, deze zegt welk antwoord onmogelijk is. Een antwoord daarbuiten
   * is geen meting maar een storing die zich als meting voordoet.
   */
  minAfstandMm: getal("SENSOR_MIN_MM", 200),
  maxAfstandMm: getal("SENSOR_MAX_MM", 5000),
  intervalSeconden: getal("POLL_INTERVAL_SECONDS", 300),

  dashboardUrl: (process.env.DASHBOARD_URL ?? "http://dashboard:3000").replace(/\/$/, ""),
  ingestToken: process.env.INGEST_TOKEN ?? "",

  /**
   * Hoeveel metingen we bijhouden als het dashboard onbereikbaar is.
   * 2016 stuks is een week aan metingen om de vijf minuten.
   */
  bufferMax: getal("BUFFER_MAX", 2016),

  /**
   * Ping-URL van een check op Healthchecks.io, bv.
   * https://hc-ping.com/<uuid>. Leeg betekent geen pings.
   */
  healthcheckUrl: (process.env.HEALTHCHECK_URL ?? "").trim().replace(/\/$/, ""),

  /** Na hoeveel mislukte rondes op rij de check op "down" gaat. */
  healthcheckFoutenVoorAlarm: getal("HEALTHCHECK_FOUTEN_VOOR_ALARM", 6),
};
