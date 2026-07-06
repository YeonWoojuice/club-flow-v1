CREATE TABLE persons (
    id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id        UUID         NOT NULL,
    name           VARCHAR(100) NOT NULL,
    email          VARCHAR(255) NOT NULL,
    phone          VARCHAR(30),
    student_number VARCHAR(50)  NOT NULL,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_persons_club
        FOREIGN KEY (club_id) REFERENCES clubs (id),
    CONSTRAINT uq_persons_club_email UNIQUE (club_id, email),
    CONSTRAINT ck_persons_email_lowercase CHECK (email = LOWER(email))
);

CREATE INDEX idx_persons_club_id ON persons (club_id);
