CREATE TABLE applications (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    generation_id UUID        NOT NULL,
    person_id     UUID        NOT NULL,
    status        VARCHAR(20) NOT NULL,
    source_type   VARCHAR(20) NOT NULL,
    submitted_at  TIMESTAMPTZ NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_applications_generation
        FOREIGN KEY (generation_id) REFERENCES generations (id),
    CONSTRAINT fk_applications_person
        FOREIGN KEY (person_id) REFERENCES persons (id),
    CONSTRAINT uq_applications_generation_person UNIQUE (generation_id, person_id),
    CONSTRAINT ck_applications_status
        CHECK (status IN ('SUBMITTED', 'REVIEWING', 'ACCEPTED', 'REJECTED', 'CANCELED')),
    CONSTRAINT ck_applications_source_type
        CHECK (source_type IN ('MANUAL', 'GOOGLE_FORM'))
);

CREATE INDEX idx_applications_generation_id ON applications (generation_id);
CREATE INDEX idx_applications_person_id ON applications (person_id);
CREATE INDEX idx_applications_generation_status ON applications (generation_id, status);
