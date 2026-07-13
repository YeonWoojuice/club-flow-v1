package com.clubflow.backend.application.importer.source.dto;

public record ApplicationImportSourceMappingResponse(
        String nameHeader,
        String emailHeader,
        String studentNumberHeader,
        String phoneHeader,
        String submittedAtHeader
) {
}
