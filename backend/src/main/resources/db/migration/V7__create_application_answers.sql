CREATE TABLE application_answers (
    id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID         NOT NULL,
    question_key   VARCHAR(100) NOT NULL,
    question_label VARCHAR(500) NOT NULL,
    answer_value   TEXT,
    answer_json    JSONB,
    display_order  INTEGER      NOT NULL,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_application_answers_application
        FOREIGN KEY (application_id) REFERENCES applications (id),
    CONSTRAINT uq_application_answers_application_question
        UNIQUE (application_id, question_key),
    CONSTRAINT ck_application_answers_display_order
        CHECK (display_order >= 0),
    CONSTRAINT ck_application_answers_has_value
        CHECK (answer_value IS NOT NULL OR answer_json IS NOT NULL)
);

CREATE INDEX idx_application_answers_application_id
    ON application_answers (application_id);
