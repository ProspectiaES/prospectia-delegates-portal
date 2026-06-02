-- ─── contact_mandates ────────────────────────────────────────────────────────
-- SEPA mandate data per client. Not overwritten by Holded sync.
-- holded_contacts.id is TEXT (Holded string ID).
CREATE TABLE IF NOT EXISTS contact_mandates (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id        text        NOT NULL REFERENCES holded_contacts(id) ON DELETE CASCADE,
  referencia_mandat text        NOT NULL,
  data_firma_mandat date        NOT NULL,
  -- RCUR = recurrent, OOFF = one-off, FRST = first, FNAL = final
  sequencia_adeut   text        NOT NULL DEFAULT 'RCUR'
                                CHECK (sequencia_adeut IN ('RCUR','OOFF','FRST','FNAL')),
  -- estandard: cobrament dilluns setmana 3
  -- ampliat:   cobrament dilluns més proper a emissió + 30 dies (mai abans d'estàndard)
  termes_pagament   text        NOT NULL DEFAULT 'estandard'
                                CHECK (termes_pagament IN ('estandard','ampliat')),
  actiu             boolean     NOT NULL DEFAULT true,
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (referencia_mandat)
);

CREATE INDEX IF NOT EXISTS idx_contact_mandates_contact ON contact_mandates(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_mandates_actiu   ON contact_mandates(contact_id, actiu);

-- ─── remeses ─────────────────────────────────────────────────────────────────
-- One remesa covers one week's worth of unpaid invoices.
CREATE TABLE IF NOT EXISTS remeses (
  id                        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  -- The Monday–Sunday window of invoices included
  setmana_inici             date        NOT NULL,
  setmana_fi                date        NOT NULL,
  -- Monday the file is generated (week 2)
  data_remesa               date        NOT NULL,
  -- Monday the bank will collect (week 3, estàndard track)
  data_cobrament_estandard  date        NOT NULL,
  estat                     text        NOT NULL DEFAULT 'esborrany'
                                        CHECK (estat IN (
                                          'esborrany','generada','transmesa',
                                          'cobrada','retornada'
                                        )),
  notes                     text,
  created_at                timestamptz NOT NULL DEFAULT now(),
  created_by                uuid        REFERENCES profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_remeses_estat         ON remeses(estat);
CREATE INDEX IF NOT EXISTS idx_remeses_setmana_inici ON remeses(setmana_inici DESC);
CREATE INDEX IF NOT EXISTS idx_remeses_created_at    ON remeses(created_at DESC);

-- ─── remesa_linies ───────────────────────────────────────────────────────────
-- One row per invoice included in a remesa.
-- holded_invoices.id and holded_contacts.id are TEXT.
CREATE TABLE IF NOT EXISTS remesa_linies (
  id                uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  remesa_id         uuid           NOT NULL REFERENCES remeses(id) ON DELETE CASCADE,
  factura_id        text           NOT NULL REFERENCES holded_invoices(id),
  contact_id        text           NOT NULL REFERENCES holded_contacts(id),
  import            numeric(10,2)  NOT NULL,
  -- estandard vs ampliat determines data_cobrament
  tipus_venciment   text           NOT NULL CHECK (tipus_venciment IN ('estandard','ampliat')),
  data_cobrament    date           NOT NULL,
  -- Snapshot of client IBAN at time of remesa generation
  iban_deutor       text           NOT NULL,
  -- Snapshot of mandate data at time of remesa generation
  referencia_mandat text           NOT NULL,
  data_firma_mandat date           NOT NULL,
  sequencia_adeut   text           NOT NULL CHECK (sequencia_adeut IN ('RCUR','OOFF','FRST','FNAL')),
  -- SEPA End-to-End ID: doc_number + short linia ID, max 35 chars
  referencia_adeut  text           NOT NULL,
  -- Free-text description for RmtInf/Ustrd in XML
  concepte          text,
  estat_linia       text           NOT NULL DEFAULT 'pendent'
                                   CHECK (estat_linia IN ('pendent','cobrada','retornada')),
  motiu_retorn      text,
  created_at        timestamptz    NOT NULL DEFAULT now(),
  -- Each invoice can only appear once per remesa
  UNIQUE (remesa_id, factura_id)
);

CREATE INDEX IF NOT EXISTS idx_remesa_linies_remesa  ON remesa_linies(remesa_id);
CREATE INDEX IF NOT EXISTS idx_remesa_linies_factura ON remesa_linies(factura_id);
CREATE INDEX IF NOT EXISTS idx_remesa_linies_contact ON remesa_linies(contact_id);
CREATE INDEX IF NOT EXISTS idx_remesa_linies_estat   ON remesa_linies(estat_linia);
CREATE INDEX IF NOT EXISTS idx_remesa_linies_data    ON remesa_linies(data_cobrament);

-- ─── remesa_esdeveniments ────────────────────────────────────────────────────
-- Append-only audit log. Never UPDATE or DELETE rows in this table.
CREATE TABLE IF NOT EXISTS remesa_esdeveniments (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  remesa_id       uuid        NOT NULL REFERENCES remeses(id),
  linia_id        uuid        REFERENCES remesa_linies(id),
  -- Event type values:
  --   remesa_creada, remesa_transmesa, remesa_cobrada, remesa_retornada
  --   linia_cobrada, linia_retornada, fitxer_descarregat
  tipus           text        NOT NULL,
  estat_anterior  text,
  estat_nou       text        NOT NULL,
  -- metadata examples:
  --   linia_retornada:     { "motiu": "...", "data_retorn": "YYYY-MM-DD", "import": 0.00 }
  --   remesa_transmesa:    { "usuari": "...", "num_linies": 5, "import_total": 0.00 }
  --   fitxer_descarregat:  { "data_cobrament": "YYYY-MM-DD", "num_linies": 5 }
  metadata        jsonb,
  usuari_id       uuid        REFERENCES profiles(id),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_remesa_esdev_remesa ON remesa_esdeveniments(remesa_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_remesa_esdev_linia  ON remesa_esdeveniments(linia_id);

-- ─── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE contact_mandates     ENABLE ROW LEVEL SECURITY;
ALTER TABLE remeses              ENABLE ROW LEVEL SECURITY;
ALTER TABLE remesa_linies        ENABLE ROW LEVEL SECURITY;
ALTER TABLE remesa_esdeveniments ENABLE ROW LEVEL SECURITY;

-- Pattern used throughout this codebase: OWNER role has full access.
CREATE POLICY "owner_all" ON contact_mandates
  USING     (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'OWNER'))
  WITH CHECK(EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'OWNER'));

CREATE POLICY "owner_all" ON remeses
  USING     (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'OWNER'))
  WITH CHECK(EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'OWNER'));

CREATE POLICY "owner_all" ON remesa_linies
  USING     (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'OWNER'))
  WITH CHECK(EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'OWNER'));

CREATE POLICY "owner_all" ON remesa_esdeveniments
  USING     (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'OWNER'))
  WITH CHECK(EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'OWNER'));

-- ─── RPC: log_remesa_esdeveniment ────────────────────────────────────────────
-- Called atomically within service transactions to ensure audit trail is never lost.
CREATE OR REPLACE FUNCTION log_remesa_esdeveniment(
  p_remesa_id      uuid,
  p_linia_id       uuid,
  p_tipus          text,
  p_estat_anterior text,
  p_estat_nou      text,
  p_metadata       jsonb,
  p_usuari_id      uuid
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO remesa_esdeveniments(
    remesa_id, linia_id, tipus,
    estat_anterior, estat_nou, metadata, usuari_id
  ) VALUES (
    p_remesa_id, p_linia_id, p_tipus,
    p_estat_anterior, p_estat_nou, p_metadata, p_usuari_id
  );
END;
$$;
