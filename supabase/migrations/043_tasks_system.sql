-- ─── Task Projects ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS task_projects (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  description TEXT,
  color       TEXT        NOT NULL DEFAULT '#8E0E1A',
  icon        TEXT        NOT NULL DEFAULT 'folder',
  created_by  UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ
);

ALTER TABLE task_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read projects"
  ON task_projects FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert projects"
  ON task_projects FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Creator or owner can update"
  ON task_projects FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Creator or owner can delete"
  ON task_projects FOR DELETE USING (auth.role() = 'authenticated');

-- ─── Tasks ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tasks (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT        NOT NULL,
  description  TEXT,
  status       TEXT        NOT NULL DEFAULT 'todo'
                           CHECK (status IN ('todo','in_progress','done','cancelled')),
  priority     TEXT        NOT NULL DEFAULT 'medium'
                           CHECK (priority IN ('low','medium','high','urgent')),
  project_id   UUID        REFERENCES task_projects(id) ON DELETE SET NULL,
  assignee_id  UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  creator_id   UUID        REFERENCES profiles(id) NOT NULL,
  due_date     DATE,
  contact_id   TEXT        REFERENCES holded_contacts(id) ON DELETE SET NULL,
  salesorder_id TEXT       REFERENCES holded_salesorders(id) ON DELETE SET NULL,
  position     FLOAT       NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ON tasks (status);
CREATE INDEX ON tasks (assignee_id);
CREATE INDEX ON tasks (project_id);
CREATE INDEX ON tasks (creator_id);
CREATE INDEX ON tasks (due_date);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read tasks"
  ON tasks FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert tasks"
  ON tasks FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Creator or assignee can update"
  ON tasks FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Creator can delete"
  ON tasks FOR DELETE USING (auth.uid() = creator_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_task_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;
CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_task_updated_at();

-- ─── Task Comments ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS task_comments (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id    UUID        NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  author_id  UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content    TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ON task_comments (task_id);

ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read comments"
  ON task_comments FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert comments"
  ON task_comments FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Author can update comment"
  ON task_comments FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "Author can delete comment"
  ON task_comments FOR DELETE USING (auth.uid() = author_id);

-- ─── Task Notifications ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS task_notifications (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  actor_id     UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  task_id      UUID        REFERENCES tasks(id) ON DELETE CASCADE,
  type         TEXT        NOT NULL
               CHECK (type IN ('assigned','commented','status_changed','mentioned','due_soon')),
  is_read      BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ON task_notifications (recipient_id, is_read);
CREATE INDEX ON task_notifications (task_id);

ALTER TABLE task_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own notifications"
  ON task_notifications FOR SELECT USING (auth.uid() = recipient_id);
CREATE POLICY "Server can insert notifications"
  ON task_notifications FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can mark own as read"
  ON task_notifications FOR UPDATE USING (auth.uid() = recipient_id);

-- Seed default project
INSERT INTO task_projects (name, description, color, icon)
VALUES ('General', 'Tasques generals sense projecte específic', '#6B7280', 'inbox')
ON CONFLICT DO NOTHING;
