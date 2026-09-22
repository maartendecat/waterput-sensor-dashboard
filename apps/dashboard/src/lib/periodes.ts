/** Client-veilig: dit bestand raakt de database niet aan. */
export const PERIODES = {
  "24u": { label: "24 uur", duurSeconden: 86_400, bucketSeconden: 600 },
  "7d": { label: "7 dagen", duurSeconden: 604_800, bucketSeconden: 3_600 },
  "30d": { label: "30 dagen", duurSeconden: 2_592_000, bucketSeconden: 10_800 },
  "12m": { label: "12 maanden", duurSeconden: 31_536_000, bucketSeconden: 86_400 },
} as const;

export type PeriodeSleutel = keyof typeof PERIODES;

export function isPeriodeSleutel(waarde: string): waarde is PeriodeSleutel {
  return Object.hasOwn(PERIODES, waarde);
}
