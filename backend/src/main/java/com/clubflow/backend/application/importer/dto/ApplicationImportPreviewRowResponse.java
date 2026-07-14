package com.clubflow.backend.application.importer.dto;

import com.clubflow.backend.application.importer.ApplicationImportRowStatus;

import java.time.Instant;
import java.util.UUID;

public record ApplicationImportPreviewRowResponse(
        Integer rowNumber,
        String name,
        String email,
        String phone,
        String studentNumber,
        String discordName,
        Instant submittedAt,
        UUID personId,
        ApplicationImportRowStatus status,
        String message
) {
    public ApplicationImportPreviewRowResponse(
            Integer rowNumber,
            String name,
            String email,
            String phone,
            String studentNumber,
            Instant submittedAt,
            UUID existingPersonId,
            ApplicationImportRowStatus status,
            String message
    ) {
        this(rowNumber, name, email, phone, studentNumber, null, submittedAt, existingPersonId, status, message);
    }
}
