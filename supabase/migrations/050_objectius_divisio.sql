-- Afegeix camp divisio a bruixola_objectius per filtrar per divisió (ex: 'internacional')
ALTER TABLE bruixola_objectius ADD COLUMN IF NOT EXISTS divisio TEXT DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_bruixola_objectius_divisio ON bruixola_objectius(divisio) WHERE divisio IS NOT NULL;
