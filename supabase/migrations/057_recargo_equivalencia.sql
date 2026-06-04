-- Indica si el client és subjecte al Règim Especial del Recargo de Equivalència
-- (Llei 37/1992 del IVA). Si és true, tots els pedidos d'aquest client han d'incloure
-- el recargo de equivalencia corresponent a cada tram d'IVA:
--   IVA 10% → R.E. 1,4%  (s_rec_14)
--   IVA 21% → R.E. 5,2%  (s_rec_52)
-- Holded rebrà els tax codes correctes i generarà les factures amb el desglossament.
ALTER TABLE holded_contacts
  ADD COLUMN IF NOT EXISTS has_recargo_equivalencia BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN holded_contacts.has_recargo_equivalencia IS
  'Client subjecte al Règim Especial del Recargo de Equivalència (Llei 37/1992 IVA)';
