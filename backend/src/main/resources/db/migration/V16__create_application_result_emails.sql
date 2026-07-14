CREATE TABLE application_result_email_batches (
    id                   UUID         PRIMARY KEY,
    club_id              UUID         NOT NULL,
    generation_id        UUID         NOT NULL,
    requested_by_user_id UUID         NOT NULL,
    decision             VARCHAR(20)  NOT NULL,
    status               VARCHAR(30)  NOT NULL,
    subject_template     VARCHAR(200) NOT NULL,
    body_template        TEXT         NOT NULL,
    kakao_link           VARCHAR(2048),
    created_at           TIMESTAMPTZ  NOT NULL,
    completed_at         TIMESTAMPTZ,

    CONSTRAINT fk_result_email_batches_club
        FOREIGN KEY (club_id) REFERENCES clubs (id),
    CONSTRAINT fk_result_email_batches_generation
        FOREIGN KEY (generation_id) REFERENCES generations (id),
    CONSTRAINT fk_result_email_batches_requested_by
        FOREIGN KEY (requested_by_user_id) REFERENCES users (id),
    CONSTRAINT ck_result_email_batches_decision
        CHECK (decision IN ('ACCEPTED', 'REJECTED')),
    CONSTRAINT ck_result_email_batches_status
        CHECK (status IN ('PENDING', 'COMPLETED', 'PARTIAL_FAILED', 'FAILED', 'UNKNOWN'))
);

CREATE INDEX idx_result_email_batches_club_created
    ON application_result_email_batches (club_id, created_at DESC);

CREATE TABLE application_result_email_messages (
    id                       UUID         PRIMARY KEY,
    batch_id                 UUID         NOT NULL,
    application_id           UUID         NOT NULL,
    status                   VARCHAR(20)  NOT NULL,
    recipient_email_snapshot VARCHAR(255) NOT NULL,
    member_name_snapshot     VARCHAR(100) NOT NULL,
    discord_name_snapshot    VARCHAR(100),
    club_name_snapshot       VARCHAR(100) NOT NULL,
    kakao_link_snapshot      VARCHAR(2048),
    subject_snapshot         VARCHAR(200) NOT NULL,
    body_snapshot            TEXT         NOT NULL,
    idempotency_key          VARCHAR(100) NOT NULL,
    provider_message_id      VARCHAR(255),
    error_message            VARCHAR(500),
    created_at               TIMESTAMPTZ  NOT NULL,
    sent_at                  TIMESTAMPTZ,
    updated_at               TIMESTAMPTZ  NOT NULL,

    CONSTRAINT fk_result_email_messages_batch
        FOREIGN KEY (batch_id) REFERENCES application_result_email_batches (id),
    CONSTRAINT fk_result_email_messages_application
        FOREIGN KEY (application_id) REFERENCES applications (id),
    CONSTRAINT uq_result_email_messages_batch_application
        UNIQUE (batch_id, application_id),
    CONSTRAINT uq_result_email_messages_idempotency
        UNIQUE (idempotency_key),
    CONSTRAINT ck_result_email_messages_status
        CHECK (status IN ('PENDING', 'SENT', 'FAILED', 'UNKNOWN'))
);

CREATE UNIQUE INDEX uq_result_email_messages_active_application
    ON application_result_email_messages (application_id)
    WHERE status IN ('PENDING', 'SENT', 'UNKNOWN');

CREATE INDEX idx_result_email_messages_application_created
    ON application_result_email_messages (application_id, created_at DESC);

CREATE INDEX idx_result_email_messages_batch
    ON application_result_email_messages (batch_id);
