package com.clubflow.backend.application.dto;

import com.clubflow.backend.application.Application;
import com.clubflow.backend.application.ApplicationSourceType;
import com.clubflow.backend.application.ApplicationStatus;

import java.time.Instant;
import java.util.UUID;

public record ApplicationSummaryResponse(
        UUID id,
        UUID generationId,
        String generationName,
        UUID personId,
        String name,
        String email,
        String phone,
        String studentNumber,
        ApplicationStatus status,
        ApplicationSourceType sourceType,
        Instant submittedAt
) {
    public static ApplicationSummaryResponse from(Application application) {
        return new ApplicationSummaryResponse(
                application.getId(),
                application.getGeneration().getId(),
                application.getGeneration().getName(),
                application.getPerson().getId(),
                application.getPerson().getName(),
                application.getPerson().getEmail(),
                application.getPerson().getPhone(),
                application.getPerson().getStudentNumber(),
                application.getStatus(),
                application.getSourceType(),
                application.getSubmittedAt()
        );
    }
}
