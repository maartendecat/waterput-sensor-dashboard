import ModbusRTU from "modbus-serial";
import { config } from "./config";

export class Sensor {
  private client = new ModbusRTU();

  private async verbind(): Promise<void> {
    if (this.client.isOpen) return;

    await this.client.connectRTUBuffered(config.poort, {
      baudRate: config.baudrate,
      dataBits: 8,
      stopBits: 1,
      parity: "none",
    });

    this.client.setID(config.slaveId);
    this.client.setTimeout(config.timeoutMs);
    console.log(
      `[sensor] verbonden met ${config.poort} @ ${config.baudrate} 8N1, slave ${config.slaveId}`,
    );
  }

  /** Leest de afstand in mm. Gooit bij elke fout — de aanroeper logt die. */
  async leesAfstandMm(): Promise<number> {
    await this.verbind();

    const antwoord = await this.client.readHoldingRegisters(config.register, 1);
    const waarde = antwoord.data[0];

    if (typeof waarde !== "number") {
      throw new Error("Leeg antwoord van de sensor");
    }
    return waarde;
  }

  /**
   * Sluit de poort zodat de volgende poging opnieuw verbindt. Nodig wanneer de
   * USB-adapter is losgekomen: de handle blijft dan open maar levert niets op.
   */
  async herstel(): Promise<void> {
    if (!this.client.isOpen) return;
    await new Promise<void>((resolve) => this.client.close(() => resolve()));
  }

  async sluit(): Promise<void> {
    await this.herstel();
  }
}
