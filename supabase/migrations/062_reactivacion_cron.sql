-- ════════════════════════════════════════════════════════════════════════════
-- CRM de reactivació — Fase 1.4: cron setmanal de detecció
-- ════════════════════════════════════════════════════════════════════════════
--
-- Cada dilluns a les 06:00 UTC, detecta clients/afiliats que han entrat en
-- estat de dormició/inactivitat des de la darrera execució i crea un registre
-- pendent a reactivation_actions. NO envia res — només detecta i deixa
-- l'acció a l'espera d'autorització (Fase 2: UI del propietari).
-- ════════════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

-- Corregeix la UNIQUE original (client_id, sequence_step) — una restricció
-- global impediria un segon cicle de reactivació pel mateix client un cop
-- tancat el primer. Ara només és única mentre el cicle estigui obert.
ALTER TABLE reactivation_actions
  DROP CONSTRAINT IF EXISTS reactivation_actions_client_id_sequence_step_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_reactivation_actions_unique_open_step
  ON reactivation_actions(client_id, sequence_step)
  WHERE status != 'cerrado';

CREATE OR REPLACE FUNCTION detect_new_dormant_actions()
RETURNS INT AS $func$
DECLARE
  v_count INT;
BEGIN
  INSERT INTO reactivation_actions (
    client_id, entity_type, owner_id, dormancy_status,
    days_inactive_at_detection, sequence_step, status
  )
  SELECT
    v.entity_id, v.entity_type, v.owner_id, v.dormancy_status, v.days_inactive, 1, 'pendiente'
  FROM v_clients_dormits v
  WHERE v.dormancy_status IN ('dormido', 'perdido', 'inactivo')
    AND NOT EXISTS (
      SELECT 1 FROM reactivation_actions ra
      WHERE ra.client_id = v.entity_id
        AND ra.sequence_step = 1
        AND ra.status != 'cerrado'
    );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$func$ LANGUAGE plpgsql;

COMMENT ON FUNCTION detect_new_dormant_actions IS
  'Detecta nous candidats a reactivació (dormido/perdido/inactivo sense cicle '
  'obert) i crea files pendent a reactivation_actions. Idempotent: re-executar '
  'no duplica files mentre el cicle anterior no estigui cerrado.';

SELECT cron.schedule(
  'detect-dormant-clients-weekly',
  '0 6 * * 1',  -- cada dilluns 06:00 UTC
  'SELECT detect_new_dormant_actions();'
);
