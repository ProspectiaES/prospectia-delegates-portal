"use client";

import { ObjectiusClient } from "../../objectius/ObjectiusClient";
import type { Objectiu } from "../../objectius/page";

type SystemMetrics = {
  ytdRevenue: number;
  annualRevenue: Record<number, number>;
  quarterRevenue: Record<string, number>;
  intlClientsCount: number;
  invoicesThisYear: number;
  currentYear: number;
};

const fmt = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

export function InternacionalObjectiusClient({
  objectius, currentYear, systemMetrics,
}: {
  objectius: Objectiu[];
  currentYear: number;
  systemMetrics: SystemMetrics;
}) {
  function getRealData(o: Objectiu): { label: string; value: number; unit?: string }[] {
    const year = o.any ?? currentYear;

    if (o.tipus === "anual") {
      const revenue = systemMetrics.annualRevenue[year] ?? 0;
      return [
        { label: `Facturació ${year}`, value: revenue, unit: "€" },
        { label: "Clients Intl.", value: systemMetrics.intlClientsCount },
        ...(o.valor_objectiu ? [{ label: "% assoliment", value: Math.round((revenue / o.valor_objectiu) * 100) }] : []),
      ];
    }

    if (o.tipus === "trimestral" && o.trimestre) {
      const key = `${year}-Q${o.trimestre}`;
      const revenue = systemMetrics.quarterRevenue[key] ?? 0;
      return [
        { label: `Fact. Q${o.trimestre} ${year}`, value: revenue, unit: "€" },
        ...(o.valor_objectiu ? [{ label: "% assoliment", value: Math.round((revenue / o.valor_objectiu) * 100) }] : []),
      ];
    }

    if (o.tipus === "mensual" && o.mes) {
      // For monthly, show YTD as proxy
      return [
        { label: `YTD ${year}`, value: systemMetrics.ytdRevenue, unit: "€" },
      ];
    }

    return [
      { label: "Facturació YTD", value: systemMetrics.ytdRevenue, unit: "€" },
      { label: "Clients Intl.", value: systemMetrics.intlClientsCount },
    ];
  }

  return (
    <ObjectiusClient
      objectius={objectius}
      currentYear={currentYear}
      defaultDivisio="internacional"
      getRealData={getRealData}
    />
  );
}
