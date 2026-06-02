export type EstatRemesa =
  | "esborrany"
  | "generada"
  | "transmesa"
  | "cobrada"
  | "retornada";

export type EstatLinia = "pendent" | "cobrada" | "retornada";
export type TipusVenciment = "estandard" | "ampliat";
export type SequenciaAdeut = "RCUR" | "OOFF" | "FRST" | "FNAL";

export type TipusEsdeveniment =
  | "remesa_creada"
  | "remesa_transmesa"
  | "remesa_cobrada"
  | "remesa_retornada"
  | "linia_cobrada"
  | "linia_retornada"
  | "fitxer_descarregat";

export interface Remesa {
  id: string;
  setmana_inici: string;
  setmana_fi: string;
  data_remesa: string;
  data_cobrament_estandard: string;
  estat: EstatRemesa;
  notes: string | null;
  created_at: string;
  created_by: string | null;
}

export interface RemesaLinia {
  id: string;
  remesa_id: string;
  factura_id: string;
  contact_id: string;
  import: number;
  tipus_venciment: TipusVenciment;
  data_cobrament: string;
  iban_deutor: string;
  referencia_mandat: string;
  data_firma_mandat: string;
  sequencia_adeut: SequenciaAdeut;
  referencia_adeut: string;
  concepte: string | null;
  estat_linia: EstatLinia;
  motiu_retorn: string | null;
  created_at: string;
}

export interface RemesaLiniaEnriquida extends RemesaLinia {
  contact_name: string;
  doc_number: string | null;
  invoice_date: string | null;
  invoice_total: number;
}

export interface RemesaEsdeveniment {
  id: string;
  remesa_id: string;
  linia_id: string | null;
  tipus: TipusEsdeveniment;
  estat_anterior: string | null;
  estat_nou: string;
  metadata: Record<string, unknown> | null;
  usuari_id: string | null;
  created_at: string;
}

export interface ContactMandat {
  id: string;
  contact_id: string;
  referencia_mandat: string;
  data_firma_mandat: string;
  sequencia_adeut: SequenciaAdeut;
  termes_pagament: TipusVenciment;
  actiu: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface RemesaConResum extends Remesa {
  num_linies: number;
  import_total: number;
  num_estandard: number;
  num_ampliat: number;
  import_estandard: number;
  import_ampliat: number;
}

export interface RemesaDetall extends Remesa {
  linies: RemesaLiniaEnriquida[];
  esdeveniments: RemesaEsdeveniment[];
  num_linies: number;
  import_total: number;
}

// For the Norma 19 generator
export interface CreditorConfig {
  nom: string;
  iban: string;
  bic: string;
  identificador: string; // ESXX-001-NNNNNNNNN
}
