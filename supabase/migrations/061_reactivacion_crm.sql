-- ════════════════════════════════════════════════════════════════════════════
-- CRM de reactivació — Fase 1: v_clients_dormits + reactivation_actions
-- ════════════════════════════════════════════════════════════════════════════
--
-- v_clients_dormits unifica clients (holded_contacts) i afiliats (bixgrow_affiliates)
-- en una sola vista amb criteris de dormició + segmentació per antiguitat i volum.
--
-- Llindars (basats en distribució real: mediana 205€, P75 388€ lifetime):
--   Client dormit   → 90-179 dies sense comanda pagada
--   Client perdut   → 180+ dies sense comanda pagada
--   Afiliat inactiu → 60+ dies sense venda (bixgrow_orders)
--   Volum alto      → >= 400€ lifetime · medio → 150-399€ · bajo → <150€
--   Antiguitat nuevo → <90 dies des de la primera compra · establecido → 90-365 · veterano → >365
--
-- No filtrem per holded_contacts.type perquè hi ha contactes amb type=NULL
-- que SÍ tenen factures pagades (serien exclosos incorrectament).
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW v_clients_dormits AS

-- ── Clients ──────────────────────────────────────────────────────────────────
WITH client_stats AS (
  SELECT
    hi.contact_id,
    MIN(hi.date_paid) AS first_order_date,
    MAX(hi.date_paid) AS last_order_date_calc,
    SUM(hi.subtotal)  AS lifetime_revenue,
    COUNT(*)          AS order_count
  FROM holded_invoices hi
  WHERE hi.status = 3
    AND (hi.is_credit_note = false OR hi.is_credit_note IS NULL)
  GROUP BY hi.contact_id
),
client_owner AS (
  SELECT DISTINCT ON (contact_id) contact_id, delegate_id
  FROM contact_delegates
  ORDER BY contact_id, assigned_at DESC
)
SELECT
  hc.id                                                AS entity_id,
  'cliente'::text                                      AS entity_type,
  hc.name                                               AS entity_name,
  hc.email,
  COALESCE(cs.last_order_date_calc, hc.last_order_date) AS last_activity_date,
  CASE
    WHEN COALESCE(cs.last_order_date_calc, hc.last_order_date) IS NULL THEN NULL
    ELSE EXTRACT(DAY FROM now() - COALESCE(cs.last_order_date_calc, hc.last_order_date))::int
  END                                                   AS days_inactive,
  CASE
    WHEN cs.contact_id IS NULL THEN 'sin_compras'
    WHEN now() - cs.last_order_date_calc < INTERVAL '90 days'  THEN 'activo'
    WHEN now() - cs.last_order_date_calc < INTERVAL '180 days' THEN 'dormido'
    ELSE 'perdido'
  END                                                   AS dormancy_status,
  COALESCE(cs.first_order_date, hc.first_synced_at)     AS first_order_date,
  CASE
    WHEN cs.first_order_date IS NULL THEN NULL
    WHEN now() - cs.first_order_date < INTERVAL '90 days'  THEN 'nuevo'
    WHEN now() - cs.first_order_date < INTERVAL '365 days' THEN 'establecido'
    ELSE 'veterano'
  END                                                   AS antiguity_segment,
  COALESCE(cs.lifetime_revenue, 0)                      AS lifetime_revenue,
  COALESCE(cs.order_count, 0)                           AS order_count,
  CASE
    WHEN cs.lifetime_revenue IS NULL OR cs.lifetime_revenue = 0 THEN 'sin_volumen'
    WHEN cs.lifetime_revenue >= 400 THEN 'alto'
    WHEN cs.lifetime_revenue >= 150 THEN 'medio'
    ELSE 'bajo'
  END                                                   AS volume_segment,
  COALESCE(co.delegate_id, hc.kol_id, hc.coordinator_id) AS owner_id,
  CASE
    WHEN co.delegate_id    IS NOT NULL THEN 'delegate'
    WHEN hc.kol_id         IS NOT NULL THEN 'kol'
    WHEN hc.coordinator_id IS NOT NULL THEN 'coordinator'
    ELSE NULL
  END                                                   AS owner_role
FROM holded_contacts hc
LEFT JOIN client_stats cs ON cs.contact_id = hc.id
LEFT JOIN client_owner co ON co.contact_id = hc.id
WHERE hc.merged_into_id IS NULL
  AND (cs.contact_id IS NOT NULL OR co.delegate_id IS NOT NULL OR hc.kol_id IS NOT NULL OR hc.coordinator_id IS NOT NULL)

UNION ALL

-- ── Afiliats ─────────────────────────────────────────────────────────────────
SELECT
  ba.id::text                                          AS entity_id,
  'afiliado'::text                                     AS entity_type,
  COALESCE(ba.first_name || ' ' || ba.last_name, ba.email) AS entity_name,
  ba.email,
  asales.last_sale_date                                AS last_activity_date,
  CASE
    WHEN asales.last_sale_date IS NULL THEN NULL
    ELSE EXTRACT(DAY FROM now() - asales.last_sale_date)::int
  END                                                   AS days_inactive,
  CASE
    WHEN asales.contact_id IS NULL THEN 'sin_ventas'
    WHEN now() - asales.last_sale_date < INTERVAL '60 days' THEN 'activo'
    ELSE 'inactivo'
  END                                                   AS dormancy_status,
  asales.first_sale_date                                AS first_order_date,
  CASE
    WHEN asales.first_sale_date IS NULL THEN NULL
    WHEN now() - asales.first_sale_date < INTERVAL '90 days'  THEN 'nuevo'
    WHEN now() - asales.first_sale_date < INTERVAL '365 days' THEN 'establecido'
    ELSE 'veterano'
  END                                                   AS antiguity_segment,
  COALESCE(asales.lifetime_amount, 0)                   AS lifetime_revenue,
  COALESCE(asales.sale_count, 0)                        AS order_count,
  CASE
    WHEN asales.lifetime_amount IS NULL OR asales.lifetime_amount = 0 THEN 'sin_volumen'
    WHEN asales.lifetime_amount >= 400 THEN 'alto'
    WHEN asales.lifetime_amount >= 150 THEN 'medio'
    ELSE 'bajo'
  END                                                   AS volume_segment,
  ba.delegate_id                                        AS owner_id,
  CASE WHEN ba.delegate_id IS NOT NULL THEN 'delegate' ELSE NULL END AS owner_role
FROM bixgrow_affiliates ba
LEFT JOIN LATERAL (
  SELECT
    bo.affiliate_id AS contact_id,
    MIN(COALESCE(hi.date_paid, bo.created_at)) AS first_sale_date,
    MAX(COALESCE(hi.date_paid, bo.created_at)) AS last_sale_date,
    SUM(bo.amount) AS lifetime_amount,
    COUNT(*)       AS sale_count
  FROM bixgrow_orders bo
  LEFT JOIN holded_invoices hi ON hi.id = bo.invoice_id
  WHERE bo.affiliate_id = ba.id
  GROUP BY bo.affiliate_id
) asales ON true
WHERE ba.status = 'Approved';

COMMENT ON VIEW v_clients_dormits IS
  'Unifica clients i afiliats amb estat de dormició, antiguitat i segment de volum. '
  'Client: dormido=90-179d, perdido=180+d sense comanda pagada. '
  'Afiliat: inactivo=60+d sense venda. Font per detectar candidats a reactivació.';


-- ════════════════════════════════════════════════════════════════════════════
-- reactivation_actions — registre d'accions de reactivació (estat + autorització)
-- reactivation_actions_log — audit trail append-only (no UPDATE/DELETE permesos)
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS reactivation_actions (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  client_id                  TEXT NOT NULL,                  -- holded_contacts.id o bixgrow_affiliates.id (text)
  entity_type                TEXT NOT NULL DEFAULT 'cliente'
                              CHECK (entity_type IN ('cliente', 'afiliado')),
  owner_id                   UUID REFERENCES profiles(id),    -- snapshot de v_clients_dormits.owner_id en el moment de detecció

  status                     TEXT NOT NULL DEFAULT 'pendiente'
                              CHECK (status IN ('pendiente', 'autorizado', 'enviado', 'respondido', 'cerrado')),

  -- Snapshot de l'estat de dormició en el moment de detecció (per a l'històric)
  dormancy_status             TEXT,
  days_inactive_at_detection  INT,

  -- Seqüència d'email assignada
  sequence_step               INT NOT NULL DEFAULT 1,         -- 1=primer email, 2=seguiment, ...
  email_template_id           UUID,                           -- FK lògica a email_templates
  email_personalizado         TEXT,                           -- text editat pel propietari abans d'autoritzar
  email_send_id                UUID,                          -- FK lògica a email_sends un cop enviat

  resultado                   TEXT
                               CHECK (resultado IS NULL OR resultado IN ('reactivado', 'sin_respuesta', 'no_contactar')),

  -- Timestamps d'auditoria — cada transició queda registrada
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  authorized_at                TIMESTAMPTZ,
  authorized_by                UUID REFERENCES profiles(id),
  sent_at                      TIMESTAMPTZ,
  responded_at                  TIMESTAMPTZ,
  closed_at                    TIMESTAMPTZ,
  closed_reason                TEXT,
  notes                        TEXT
);

-- Únic per (client_id, sequence_step) MENTRE el cicle estigui obert (status != 'cerrado').
-- Un cop tancat, es permet un nou cicle de reactivació (nou sequence_step=1) per al mateix
-- client en el futur — una UNIQUE global impediria reactivar-lo mai més després del primer cicle.
CREATE UNIQUE INDEX IF NOT EXISTS idx_reactivation_actions_unique_open_step
  ON reactivation_actions(client_id, sequence_step)
  WHERE status != 'cerrado';

CREATE INDEX IF NOT EXISTS idx_reactivation_actions_owner  ON reactivation_actions(owner_id);
CREATE INDEX IF NOT EXISTS idx_reactivation_actions_client ON reactivation_actions(client_id);
CREATE INDEX IF NOT EXISTS idx_reactivation_actions_status ON reactivation_actions(status);

COMMENT ON TABLE reactivation_actions IS
  'Una fila per acció de reactivació (client+pas de seqüència). El cicle de vida '
  '(pendiente→autorizado→enviado→respondido→cerrado) queda registrat amb timestamp '
  'a cada transició i, a més, loguejat de forma immutable a reactivation_actions_log.';


-- Audit trail append-only: cada canvi d'estat queda registrat com a fila immutable
CREATE TABLE IF NOT EXISTS reactivation_actions_log (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reactivation_action_id   UUID NOT NULL REFERENCES reactivation_actions(id) ON DELETE CASCADE,
  status_from              TEXT,
  status_to                TEXT NOT NULL,
  changed_by                UUID REFERENCES profiles(id),
  changed_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata                  JSONB
);

CREATE INDEX IF NOT EXISTS idx_reactivation_log_action ON reactivation_actions_log(reactivation_action_id);

-- Bloqueja només UPDATE — ningú pot reescriure l'historial.
-- DELETE es permet (només via CASCADE quan s'esborra la fila pare,
-- p.ex. neteja administrativa d'un registre erroni); l'historial mai
-- es pot alterar parcialment, només eliminar-se íntegre junt amb el seu pare.
CREATE OR REPLACE FUNCTION prevent_log_mutation()
RETURNS TRIGGER AS $func$
BEGIN
  RAISE EXCEPTION 'reactivation_actions_log es append-only: no se permite UPDATE';
END;
$func$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_log_mutation ON reactivation_actions_log;
CREATE TRIGGER trg_prevent_log_mutation
  BEFORE UPDATE ON reactivation_actions_log
  FOR EACH ROW EXECUTE FUNCTION prevent_log_mutation();

-- updated_at es manté BEFORE (modifica NEW abans d'escriure la fila)
CREATE OR REPLACE FUNCTION touch_reactivation_updated_at()
RETURNS TRIGGER AS $func$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$func$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_touch_reactivation_updated_at ON reactivation_actions;
CREATE TRIGGER trg_touch_reactivation_updated_at
  BEFORE INSERT OR UPDATE ON reactivation_actions
  FOR EACH ROW EXECUTE FUNCTION touch_reactivation_updated_at();

-- El log ha de ser AFTER: la FK a reactivation_actions(id) només es satisfà
-- un cop la fila pare ja existeix a la taula (un BEFORE trigger falla aquí).
CREATE OR REPLACE FUNCTION log_reactivation_status_change()
RETURNS TRIGGER AS $func$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO reactivation_actions_log (reactivation_action_id, status_from, status_to)
    VALUES (NEW.id, NULL, NEW.status);
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO reactivation_actions_log (reactivation_action_id, status_from, status_to)
    VALUES (NEW.id, OLD.status, NEW.status);
  END IF;
  RETURN NEW;
END;
$func$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_log_reactivation_status ON reactivation_actions;
CREATE TRIGGER trg_log_reactivation_status
  AFTER INSERT OR UPDATE ON reactivation_actions
  FOR EACH ROW EXECUTE FUNCTION log_reactivation_status_change();


-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE reactivation_actions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactivation_actions_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner_admin_full_access" ON reactivation_actions;
CREATE POLICY "owner_admin_full_access" ON reactivation_actions
  FOR ALL TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') IN ('OWNER', 'ADMIN'));

DROP POLICY IF EXISTS "delegate_select_own" ON reactivation_actions;
CREATE POLICY "delegate_select_own" ON reactivation_actions
  FOR SELECT TO authenticated
  USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "delegate_update_own" ON reactivation_actions;
CREATE POLICY "delegate_update_own" ON reactivation_actions
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "log_select_owner_admin_or_own" ON reactivation_actions_log;
CREATE POLICY "log_select_owner_admin_or_own" ON reactivation_actions_log
  FOR SELECT TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('OWNER', 'ADMIN')
    OR EXISTS (
      SELECT 1 FROM reactivation_actions ra
      WHERE ra.id = reactivation_action_id AND ra.owner_id = auth.uid()
    )
  );
