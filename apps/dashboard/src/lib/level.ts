/**
 * De sensor hangt aan het plafond van de put en meet de afstand tot het
 * wateroppervlak. Een kleine afstand betekent dus veel water, een grote
 * afstand weinig. De kalibratie bestaat uit twee gemeten afstanden en het
 * volume dat daartussen zit.
 */
export type Configuratie = {
  afstandVolMm: number;
  afstandLeegMm: number;
  volumeLiter: number;
};

export type Niveau = {
  /** 0 = leeg, 1 = vol. Afgekapt op het bereik. */
  fractie: number;
  percentage: number;
  liter: number;
  /** De meting lag buiten het gekalibreerde bereik. */
  buitenBereik: "boven" | "onder" | null;
};

export function berekenNiveau(
  afstandMm: number,
  config: Configuratie,
): Niveau {
  const bereik = config.afstandLeegMm - config.afstandVolMm;

  // Een bereik van nul zou delen door nul geven. De configuratiepagina
  // weigert dit al, maar een oude of handmatig aangepaste database kan het
  // alsnog bevatten.
  if (bereik <= 0) {
    return { fractie: 0, percentage: 0, liter: 0, buitenBereik: null };
  }

  const ruw = (config.afstandLeegMm - afstandMm) / bereik;
  const fractie = Math.min(1, Math.max(0, ruw));

  let buitenBereik: "boven" | "onder" | null = null;
  if (ruw > 1) buitenBereik = "boven";
  else if (ruw < 0) buitenBereik = "onder";

  return {
    fractie,
    percentage: fractie * 100,
    liter: fractie * config.volumeLiter,
    buitenBereik,
  };
}
