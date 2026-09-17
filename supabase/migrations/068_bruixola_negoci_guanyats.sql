-- Seguiment de projectes guanyats: dates i percentatges de comissió que
-- determinen quan caduca l'acord (ex: 5 anys des del primer enviament).
-- Additiu sobre bruixola_oportunitats (taula pròpia d'avui).

ALTER TABLE bruixola_oportunitats
  ADD COLUMN IF NOT EXISTS data_signatura           DATE,
  ADD COLUMN IF NOT EXISTS data_primer_enviament     DATE,
  ADD COLUMN IF NOT EXISTS comissio_pct              NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS llicencia_pct             NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS durada_comissio_anys      SMALLINT,
  ADD COLUMN IF NOT EXISTS durada_contracte_mesos    SMALLINT,
  ADD COLUMN IF NOT EXISTS renovacio_automatica      BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS doc_contracte_ref         TEXT;

CREATE INDEX IF NOT EXISTS idx_bo_data_primer_enviament ON bruixola_oportunitats(data_primer_enviament) WHERE data_primer_enviament IS NOT NULL;

NOTIFY pgrst, 'reload schema';
