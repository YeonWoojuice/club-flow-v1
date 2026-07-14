ALTER TABLE club_staff_invitations
    ADD COLUMN invitation_code_hash VARCHAR(64);

CREATE UNIQUE INDEX uq_club_staff_invitations_pending_code_hash
    ON club_staff_invitations (invitation_code_hash)
    WHERE status = 'PENDING' AND invitation_code_hash IS NOT NULL;
