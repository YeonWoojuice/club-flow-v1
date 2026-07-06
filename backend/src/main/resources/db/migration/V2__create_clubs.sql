CREATE TABLE clubs (
    id                 UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    name               VARCHAR(100) NOT NULL,
    description        TEXT,
    created_by_user_id UUID         NOT NULL,
    created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_clubs_created_by_user
        FOREIGN KEY (created_by_user_id) REFERENCES users (id)
);

CREATE INDEX idx_clubs_created_by_user_id ON clubs (created_by_user_id);
