ALTER TABLE persons
    ADD COLUMN discord_name VARCHAR(100);

ALTER TABLE application_import_sources
    ADD COLUMN discord_name_header VARCHAR(255);
