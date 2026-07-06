CREATE TABLE club_staffs (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id    UUID        NOT NULL,
    user_id    UUID        NOT NULL,
    role       VARCHAR(30) NOT NULL,
    status     VARCHAR(30) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_club_staffs_club
        FOREIGN KEY (club_id) REFERENCES clubs (id) ON DELETE CASCADE,
    CONSTRAINT fk_club_staffs_user
        FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT uq_club_staffs_club_user UNIQUE (club_id, user_id),
    CONSTRAINT ck_club_staffs_role
        CHECK (role IN ('PRESIDENT', 'VICE_PRESIDENT', 'STAFF')),
    CONSTRAINT ck_club_staffs_status
        CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'REVOKED'))
);

CREATE INDEX idx_club_staffs_user_status ON club_staffs (user_id, status);
CREATE INDEX idx_club_staffs_club_status ON club_staffs (club_id, status);
