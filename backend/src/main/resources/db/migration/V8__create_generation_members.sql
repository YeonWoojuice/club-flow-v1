CREATE TABLE generation_members (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    generation_id UUID        NOT NULL,
    person_id     UUID        NOT NULL,
    joined_source VARCHAR(30) NOT NULL,
    status        VARCHAR(20) NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_generation_members_generation
        FOREIGN KEY (generation_id) REFERENCES generations (id),
    CONSTRAINT fk_generation_members_person
        FOREIGN KEY (person_id) REFERENCES persons (id),
    CONSTRAINT uq_generation_members_generation_person
        UNIQUE (generation_id, person_id),
    CONSTRAINT ck_generation_members_joined_source
        CHECK (joined_source IN ('APPLICATION_ACCEPT', 'MANUAL', 'RETENTION')),
    CONSTRAINT ck_generation_members_status
        CHECK (status IN ('ACTIVE', 'INACTIVE', 'WITHDRAWN'))
);

CREATE INDEX idx_generation_members_generation_id
    ON generation_members (generation_id);
CREATE INDEX idx_generation_members_person_id
    ON generation_members (person_id);
CREATE INDEX idx_generation_members_generation_status
    ON generation_members (generation_id, status);
