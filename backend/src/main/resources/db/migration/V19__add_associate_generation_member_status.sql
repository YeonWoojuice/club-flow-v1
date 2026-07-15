ALTER TABLE generation_member_status_histories
    DROP CONSTRAINT ck_member_status_histories_previous_status;
ALTER TABLE generation_member_status_histories
    DROP CONSTRAINT ck_member_status_histories_new_status;
ALTER TABLE generation_members
    DROP CONSTRAINT ck_generation_members_status;

UPDATE generation_member_status_histories
SET previous_status = 'REGULAR'
WHERE previous_status = 'ACTIVE';

UPDATE generation_member_status_histories
SET new_status = 'REGULAR'
WHERE new_status = 'ACTIVE';

UPDATE generation_members
SET status = 'REGULAR'
WHERE status = 'ACTIVE';

ALTER TABLE generation_members
    ADD CONSTRAINT ck_generation_members_status
        CHECK (status IN ('REGULAR', 'ASSOCIATE', 'INACTIVE', 'WITHDRAWN'));
ALTER TABLE generation_member_status_histories
    ADD CONSTRAINT ck_member_status_histories_previous_status
        CHECK (previous_status IN ('REGULAR', 'ASSOCIATE', 'INACTIVE', 'WITHDRAWN'));
ALTER TABLE generation_member_status_histories
    ADD CONSTRAINT ck_member_status_histories_new_status
        CHECK (new_status IN ('REGULAR', 'ASSOCIATE', 'INACTIVE', 'WITHDRAWN'));
