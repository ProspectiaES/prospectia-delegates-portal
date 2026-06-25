-- last_order_date a holded_contacts, mantingut automàticament via trigger
-- sobre holded_invoices (status=3 Pagada, exclou notes de crèdit)

ALTER TABLE holded_contacts
  ADD COLUMN IF NOT EXISTS last_order_date TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_holded_contacts_last_order
  ON holded_contacts(last_order_date);

CREATE OR REPLACE FUNCTION update_last_order_date()
RETURNS TRIGGER AS $func$
BEGIN
  IF NEW.status = 3 AND (NEW.is_credit_note = false OR NEW.is_credit_note IS NULL) THEN
    UPDATE holded_contacts
    SET last_order_date = GREATEST(last_order_date, NEW.date_paid)
    WHERE id = NEW.contact_id;
  END IF;
  RETURN NEW;
END;
$func$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_last_order ON holded_invoices;
CREATE TRIGGER trg_update_last_order
  AFTER INSERT OR UPDATE ON holded_invoices
  FOR EACH ROW EXECUTE FUNCTION update_last_order_date();

-- Recàlcul manual (per poblar històric o reparar desviacions)
CREATE OR REPLACE FUNCTION recalculate_last_order_dates()
RETURNS void AS $func$
  UPDATE holded_contacts hc
  SET last_order_date = (
    SELECT MAX(date_paid)
    FROM holded_invoices hi
    WHERE hi.contact_id = hc.id
      AND hi.status = 3
      AND (hi.is_credit_note = false OR hi.is_credit_note IS NULL)
  );
$func$ LANGUAGE sql;

SELECT recalculate_last_order_dates();
