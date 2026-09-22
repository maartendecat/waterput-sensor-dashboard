"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Haalt de serverrender periodiek opnieuw op, zodat een scherm dat open blijft
 * staan niet urenlang een oud peil toont. router.refresh() vervangt enkel de
 * servergegevens; de clienttoestand van de grafiek blijft staan.
 */
export function AutoVernieuwen({ secondes = 60 }: { secondes?: number }) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => {
      // Een achtergrondtab hoeft niet te blijven pollen.
      if (document.visibilityState === "visible") router.refresh();
    }, secondes * 1000);

    return () => clearInterval(id);
  }, [router, secondes]);

  return null;
}
