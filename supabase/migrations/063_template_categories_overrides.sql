-- ════════════════════════════════════════════════════════════════════════════
-- Plantilles d'email: categories + idioma + override ad hoc per client
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE email_templates
  ADD COLUMN IF NOT EXISTS category   TEXT NOT NULL DEFAULT 'prospecto'
                            CHECK (category IN ('prospecto', 'reactivacion')),
  ADD COLUMN IF NOT EXISTS language   TEXT NOT NULL DEFAULT 'es'
                            CHECK (language IN ('ca', 'es')),
  ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT false;

-- Només una plantilla per defecte per (categoria, idioma)
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_templates_one_default
  ON email_templates(category, language)
  WHERE is_default = true;

-- ── Plantilles de reactivació per defecte (ES + CA) ──────────────────────────
-- Placeholders: {{nombre}} {{delegado}} {{ultima_compra}}
-- {{ultima_compra}} es resol al servidor com una frase completa o cadena buida
-- (evita gramàtica trencada si no hi ha dades de factura/producte).

INSERT INTO email_templates (name, subject, body_text, body_html, category, language, is_default)
SELECT
  'Reactivación — Español (defecto)',
  '¿Cómo te ha ido? Te echamos de menos',
  E'Hola {{nombre}},\n\nHace tiempo que no tenemos noticias tuyas y nos gustaría saber cómo te ha ido. {{ultima_compra}}\n\nSi necesitas reponer producto, tienes alguna duda o simplemente quieres ponerte al día, aquí estamos para ayudarte. Si lo prefieres, también podemos organizar una visita comercial sin compromiso.\n\nUn saludo,\n{{delegado}}',
  E'Hola {{nombre}},<br><br>Hace tiempo que no tenemos noticias tuyas y nos gustaría saber cómo te ha ido. {{ultima_compra}}<br><br>Si necesitas reponer producto, tienes alguna duda o simplemente quieres ponerte al día, aquí estamos para ayudarte. Si lo prefieres, también podemos organizar una visita comercial sin compromiso.<br><br>Un saludo,<br>{{delegado}}',
  'reactivacion', 'es', true
WHERE NOT EXISTS (SELECT 1 FROM email_templates WHERE category='reactivacion' AND language='es' AND is_default=true);

INSERT INTO email_templates (name, subject, body_text, body_html, category, language, is_default)
SELECT
  'Reactivación — Català (per defecte)',
  'Com t''ha anat? Et trobem a faltar',
  E'Hola {{nombre}},\n\nFa temps que no tenim notícies teves i ens agradaria saber com et ha anat. {{ultima_compra}}\n\nSi necessites reposar producte, tens algun dubte o simplement vols posar-te al dia, aquí som per ajudar-te. Si ho prefereixes, també podem organitzar una visita comercial sense compromís.\n\nUna salutació,\n{{delegado}}',
  E'Hola {{nombre}},<br><br>Fa temps que no tenim notícies teves i ens agradaria saber com et ha anat. {{ultima_compra}}<br><br>Si necessites reposar producte, tens algun dubte o simplement vols posar-te al dia, aquí som per ajudar-te. Si ho prefereixes, també podem organitzar una visita comercial sense compromís.<br><br>Una salutació,<br>{{delegado}}',
  'reactivacion', 'ca', true
WHERE NOT EXISTS (SELECT 1 FROM email_templates WHERE category='reactivacion' AND language='ca' AND is_default=true);


-- ── Override ad hoc: assignar una plantilla específica a un client concret ──
CREATE TABLE IF NOT EXISTS client_template_overrides (
  client_id    TEXT NOT NULL,
  category     TEXT NOT NULL DEFAULT 'reactivacion'
               CHECK (category IN ('prospecto', 'reactivacion')),
  language     TEXT NOT NULL CHECK (language IN ('ca', 'es')),
  template_id  UUID NOT NULL REFERENCES email_templates(id) ON DELETE CASCADE,
  created_by   UUID REFERENCES profiles(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (client_id, category, language)
);

COMMENT ON TABLE client_template_overrides IS
  'Permet assignar una plantilla ad hoc a un client concret per categoria+idioma, '
  'substituint la plantilla per defecte. Exemple: un client VIP sempre rep una '
  'plantilla de reactivació personalitzada en comptes de la genèrica.';

ALTER TABLE client_template_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner_admin_full_access" ON client_template_overrides;
CREATE POLICY "owner_admin_full_access" ON client_template_overrides
  FOR ALL TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') IN ('OWNER', 'ADMIN'));
