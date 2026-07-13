package com.clubflow.backend.application.importer.source.dto;

import com.clubflow.backend.member.retention.dto.ParsedTableResponse;

public record ApplicationImportSourceTableResponse(
        ApplicationImportSourceResponse source,
        ParsedTableResponse table
) {
}
