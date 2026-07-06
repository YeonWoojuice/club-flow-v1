CREATE TABLE users (
    id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    google_sub        VARCHAR(255) NOT NULL,
    email             VARCHAR(255) NOT NULL,
    name              VARCHAR(100) NOT NULL,
    profile_image_url TEXT,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    last_login_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_users_google_sub UNIQUE (google_sub),
    CONSTRAINT uq_users_email UNIQUE (email)
);
