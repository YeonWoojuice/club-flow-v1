ALTER TABLE generation_members
    ADD COLUMN dues_status VARCHAR(20) NOT NULL DEFAULT 'UNKNOWN',
    ADD COLUMN dues_status_updated_at TIMESTAMPTZ,
    ADD COLUMN dues_status_updated_by UUID,
    ADD CONSTRAINT ck_generation_members_dues_status
        CHECK (dues_status IN ('UNKNOWN', 'UNPAID', 'PAID', 'EXEMPT')),
    ADD CONSTRAINT fk_generation_members_dues_status_updated_by
        FOREIGN KEY (dues_status_updated_by) REFERENCES users (id);

CREATE INDEX idx_generation_members_dues_status_updated_by
    ON generation_members (dues_status_updated_by);
