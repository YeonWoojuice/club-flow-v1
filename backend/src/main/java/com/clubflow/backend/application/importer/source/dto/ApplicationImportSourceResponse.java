package com.clubflow.backend.application.importer.source.dto;

import java.time.Instant;
import java.util.UUID;

public record ApplicationImportSourceResponse(
        UUID id,
        UUID clubId,
        String displayName,
        String spreadsheetId,
        Long sheetId,
        String sheetTitle,
        ApplicationImportSourceMappingResponse mapping,
        String headerFingerprint,
        Instant createdAt,
        Instant updatedAt
) {
}
