package com.clubflow.backend.application.email.dto;

import com.clubflow.backend.application.email.ApplicationResultEmailStatus;

import java.util.UUID;

public record ApplicationResultEmailPreviewRowResponse(
        UUID applicationId,
        String memberName,
        String email,
        String discordName,
        ApplicationResultEmailStatus resultEmailStatus,
        boolean sendable,
        String reason,
        String renderedSubject,
        String renderedBody
) {
}
