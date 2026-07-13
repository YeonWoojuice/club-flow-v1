CREATE TABLE application_import_sources (
    id                         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id                    UUID         NOT NULL,
    display_name               VARCHAR(100) NOT NULL,
    spreadsheet_id             VARCHAR(255) NOT NULL,
    sheet_id                   BIGINT       NOT NULL,
    sheet_title                VARCHAR(255) NOT NULL,
    name_header                VARCHAR(255) NOT NULL,
    email_header               VARCHAR(255) NOT NULL,
    student_number_header      VARCHAR(255) NOT NULL,
    phone_header               VARCHAR(255),
    submitted_at_header        VARCHAR(255),
    header_fingerprint         VARCHAR(64)  NOT NULL,
    created_at                 TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at                 TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_application_import_sources_club
        FOREIGN KEY (club_id) REFERENCES clubs (id) ON DELETE CASCADE,
    CONSTRAINT uq_application_import_sources_club_name
        UNIQUE (club_id, display_name),
    CONSTRAINT ck_application_import_sources_sheet_id
        CHECK (sheet_id >= 0)
);

CREATE INDEX idx_application_import_sources_club_id
    ON application_import_sources (club_id);
