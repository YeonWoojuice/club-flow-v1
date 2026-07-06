CREATE TABLE generations (
    id                 UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id            UUID         NOT NULL,
    name               VARCHAR(100) NOT NULL,
    status             VARCHAR(20)  NOT NULL,
    start_date         DATE         NOT NULL,
    end_date           DATE         NOT NULL,
    created_by_user_id UUID         NOT NULL,
    created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    closed_at          TIMESTAMPTZ,

    CONSTRAINT fk_generations_club
        FOREIGN KEY (club_id) REFERENCES clubs (id),
    CONSTRAINT fk_generations_created_by_user
        FOREIGN KEY (created_by_user_id) REFERENCES users (id),
    CONSTRAINT ck_generations_status
        CHECK (status IN ('ACTIVE', 'CLOSED')),
    CONSTRAINT ck_generations_date_range
        CHECK (end_date >= start_date)
);

CREATE INDEX idx_generations_club_id ON generations (club_id);
CREATE INDEX idx_generations_created_by_user_id ON generations (created_by_user_id);
CREATE UNIQUE INDEX uq_generations_one_active_per_club
    ON generations (club_id)
    WHERE status = 'ACTIVE';
