package com.clubflow.backend.application.importer.source.dto;

public record ApplicationImportSourceMappingResponse(
        String nameHeader,
        String emailHeader,
        String studentNumberHeader,
        String phoneHeader,
        String submittedAtHeader,
        String discordNameHeader
) {
    public ApplicationImportSourceMappingResponse(
            String nameHeader,
            String emailHeader,
            String studentNumberHeader,
            String phoneHeader,
            String submittedAtHeader
    ) {
        this(nameHeader, emailHeader, studentNumberHeader, phoneHeader, submittedAtHeader, null);
    }
}
