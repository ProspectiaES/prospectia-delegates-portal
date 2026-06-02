/**
 * SEPA Direct Debit Core — pain.008.001.02 XML generator
 * Compatible with CaixaGuissona GOL "Transmissió Fitxer de Rebuts"
 *
 * One file per unique data_cobrament (estàndard / ampliat may produce two files).
 * Each file has exactly one PmtInf block → one ReqdColltnDt.
 */

import type { Remesa, RemesaLinia, CreditorConfig } from "./types";
import { toISODate } from "./calculs";

// ─── Lightweight types for the generator ─────────────────────────────────────

export interface ClientXML {
  id: string;
  name: string;
  bic?: string | null;
}

export interface FacturaXML {
  id: string;
  doc_number: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function truncate(s: string, max: number): string {
  return s.slice(0, max);
}

function fmtAmount(n: number): string {
  return n.toFixed(2);
}

/** Derive BIC from Spanish IBAN bank code (best-effort; falls back to NOTPROVIDED) */
const BANK_BIC: Record<string, string> = {
  "0182": "BBVAESMMXXX",
  "0049": "BSCHESMMXXX",
  "2100": "CAIXESBBXXX",
  "0075": "POPUESMM",
  "0081": "BSABESBB",
  "0128": "BACAESMM",
  "2038": "CAHMESMMXXX",
  "0030": "CRESESMMXXX",
  "3025": "CAIXAGUI2XXX",  // CaixaGuissona (codi antic)
  "3140": "CAIXAGUI2XXX",  // Banc Guissona (codi actual)
  "0073": "OPENESMMXXX",
  "0065": "CIABESMMXXX",
  "2085": "INGDESMM",
  "1465": "INGDESMMXXX",
  "0019": "DEUTESBBXXX",
  "0487": "DEUTESBBXXX",
  "0238": "BANCESMMXXX",
  "9000": "BCOEESMM",
};

function deriveBic(iban: string, storedBic?: string | null): string {
  if (storedBic?.trim()) return storedBic.trim();
  if (iban.startsWith("ES") && iban.length === 24) {
    const bankCode = iban.slice(4, 8);
    return BANK_BIC[bankCode] ?? "NOTPROVIDED";
  }
  return "NOTPROVIDED";
}

/** Basic Spanish IBAN validation */
export function validateIban(iban: string): boolean {
  const clean = iban.replace(/\s/g, "").toUpperCase();
  return clean.startsWith("ES") && clean.length === 24;
}

// ─── XML builder ─────────────────────────────────────────────────────────────

function buildPmtInf(
  remesaId: string,
  dataCobrament: Date,
  linies: RemesaLinia[],
  clients: Map<string, ClientXML>,
  factures: Map<string, FacturaXML>,
  config: CreditorConfig
): string {
  const collectionDate = toISODate(dataCobrament);
  const pmtInfId = truncate(`${remesaId.slice(0, 18)}-${collectionDate.replace(/-/g, "")}`, 35);

  // SeqTp: RCUR if all RCUR, else FRST if any FRST, else RCUR
  const seqTypes = linies.map((l) => l.sequencia_adeut);
  const hasFirsts = seqTypes.some((s) => s === "FRST");
  const seqTp = hasFirsts ? "FRST" : "RCUR";

  const ctrlSum = fmtAmount(linies.reduce((s, l) => s + l.import, 0));

  const txBlocks = linies
    .map((linia) => {
      const client = clients.get(linia.contact_id);
      const factura = factures.get(linia.factura_id);
      const clientNom = truncate(esc(client?.name ?? "DESCONEGUT"), 70);
      const dbtrBic = deriveBic(linia.iban_deutor, client?.bic);

      const docNumber = factura?.doc_number ?? linia.factura_id.slice(0, 20);
      const endToEndId = truncate(`${docNumber}-${linia.id.slice(0, 8)}`, 35);
      const remtInf = truncate(esc(linia.concepte ?? docNumber), 140);

      return `      <DrctDbtTxInf>
        <PmtId>
          <EndToEndId>${esc(endToEndId)}</EndToEndId>
        </PmtId>
        <InstdAmt Ccy="EUR">${fmtAmount(linia.import)}</InstdAmt>
        <DrctDbtTx>
          <MndtRltdInf>
            <MndtId>${esc(truncate(linia.referencia_mandat, 35))}</MndtId>
            <DtOfSgntr>${linia.data_firma_mandat}</DtOfSgntr>
          </MndtRltdInf>
        </DrctDbtTx>
        <DbtrAgt>
          <FinInstnId>
            <BIC>${esc(dbtrBic)}</BIC>
          </FinInstnId>
        </DbtrAgt>
        <Dbtr>
          <Nm>${clientNom}</Nm>
        </Dbtr>
        <DbtrAcct>
          <Id>
            <IBAN>${esc(linia.iban_deutor.replace(/\s/g, "").toUpperCase())}</IBAN>
          </Id>
        </DbtrAcct>
        <Purp>
          <Cd>GDDS</Cd>
        </Purp>
        <RmtInf>
          <Ustrd>${remtInf}</Ustrd>
        </RmtInf>
      </DrctDbtTxInf>`;
    })
    .join("\n");

  return `    <PmtInf>
      <PmtInfId>${esc(pmtInfId)}</PmtInfId>
      <PmtMtd>DD</PmtMtd>
      <NbOfTxs>${linies.length}</NbOfTxs>
      <CtrlSum>${ctrlSum}</CtrlSum>
      <PmtTpInf>
        <SvcLvl>
          <Cd>SEPA</Cd>
        </SvcLvl>
        <LclInstrm>
          <Cd>CORE</Cd>
        </LclInstrm>
        <SeqTp>${seqTp}</SeqTp>
      </PmtTpInf>
      <ReqdColltnDt>${collectionDate}</ReqdColltnDt>
      <Cdtr>
        <Nm>${esc(truncate(config.nom, 70))}</Nm>
      </Cdtr>
      <CdtrAcct>
        <Id>
          <IBAN>${esc(config.iban.replace(/\s/g, "").toUpperCase())}</IBAN>
        </Id>
      </CdtrAcct>
      <CdtrAgt>
        <FinInstnId>
          <BIC>${esc(config.bic)}</BIC>
        </FinInstnId>
      </CdtrAgt>
      <CdtrSchmeId>
        <Id>
          <PrvtId>
            <Othr>
              <Id>${esc(config.identificador)}</Id>
              <SchmeNm>
                <Prtry>SEPA</Prtry>
              </SchmeNm>
            </Othr>
          </PrvtId>
        </Id>
      </CdtrSchmeId>
${txBlocks}
    </PmtInf>`;
}

// ─── Public function ──────────────────────────────────────────────────────────

export interface Norma19File {
  dataCobrament: Date;
  filename: string;
  xml: string;
}

/**
 * Generates one SEPA pain.008.001.02 XML file per unique collection date.
 * Filename: REMESA_PROSPECTIA_YYYYMMDD.xml
 *
 * The GrpHdr spans all transactions across all PmtInf blocks in the same file.
 * For multiple collection dates (estàndard + ampliat), returns multiple files.
 */
export function generateNorma19(
  remesa: Remesa,
  linies: RemesaLinia[],
  clients: Map<string, ClientXML>,
  factures: Map<string, FacturaXML>,
  config: CreditorConfig
): Norma19File[] {
  // Validate all IBANs
  const invalidIbans = linies.filter((l) => !validateIban(l.iban_deutor));
  if (invalidIbans.length > 0) {
    const nums = invalidIbans.map((l) => l.factura_id).join(", ");
    throw new Error(`IBANs no vàlids per a les factures: ${nums}`);
  }

  // Group by unique data_cobrament
  const byDate = new Map<string, RemesaLinia[]>();
  for (const linia of linies) {
    const key = linia.data_cobrament;
    const group = byDate.get(key) ?? [];
    group.push(linia);
    byDate.set(key, group);
  }

  const now = new Date();
  const creaDtTm = now.toISOString().replace(/\.\d{3}Z$/, "");

  const files: Norma19File[] = [];

  for (const [dateStr, dateLinies] of byDate.entries()) {
    const dataCobrament = new Date(dateStr + "T00:00:00");
    const nbOfTxs = dateLinies.length;
    const ctrlSum = fmtAmount(dateLinies.reduce((s, l) => s + l.import, 0));

    // MsgId max 35 chars
    const ts = now.toISOString().replace(/[^0-9]/g, "").slice(0, 14);
    const msgId = truncate(`REM-${remesa.id.slice(0, 8)}-${ts}`, 35);

    const pmtInfXml = buildPmtInf(
      remesa.id,
      dataCobrament,
      dateLinies,
      clients,
      factures,
      config
    );

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.008.001.02"
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
          xsi:schemaLocation="urn:iso:std:iso:20022:tech:xsd:pain.008.001.02 pain.008.001.02.xsd">
  <CstmrDrctDbtInitn>
    <GrpHdr>
      <MsgId>${esc(msgId)}</MsgId>
      <CreDtTm>${creaDtTm}</CreDtTm>
      <NbOfTxs>${nbOfTxs}</NbOfTxs>
      <CtrlSum>${ctrlSum}</CtrlSum>
      <InitgPty>
        <Nm>${esc(truncate(config.nom, 70))}</Nm>
      </InitgPty>
    </GrpHdr>
${pmtInfXml}
  </CstmrDrctDbtInitn>
</Document>`;

    const ymd = dateStr.replace(/-/g, "");
    files.push({
      dataCobrament,
      filename: `REMESA_PROSPECTIA_${ymd}.xml`,
      xml,
    });
  }

  // Sort by date ascending
  files.sort((a, b) => a.dataCobrament.getTime() - b.dataCobrament.getTime());
  return files;
}
