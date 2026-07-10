CREATE TABLE google_connections (
    id                       UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                  UUID         NOT NULL,
    google_account_email     VARCHAR(255) NOT NULL,
    access_token_encrypted   TEXT         NOT NULL,
    refresh_token_encrypted  TEXT,
    scope                    TEXT         NOT NULL,
    expires_at               TIMESTAMPTZ  NOT NULL,
    created_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_google_connections_user
        FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT uq_google_connections_user UNIQUE (user_id)
);

CREATE INDEX idx_google_connections_email ON google_connections (google_account_email);
