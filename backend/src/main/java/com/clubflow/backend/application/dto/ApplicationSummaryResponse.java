package com.clubflow.backend.application.dto;

import com.clubflow.backend.application.Application;
import com.clubflow.backend.application.ApplicationSourceType;
import com.clubflow.backend.application.ApplicationStatus;
import com.clubflow.backend.application.email.ApplicationResultEmailQueryService.ResultEmailState;
import com.clubflow.backend.application.email.ApplicationResultEmailStatus;

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
        String discordName,
        ApplicationStatus status,
        ApplicationSourceType sourceType,
        Instant submittedAt,
        ApplicationResultEmailStatus resultEmailStatus,
        Instant resultEmailSentAt
) {
    public static ApplicationSummaryResponse from(Application application) {
        return from(application, ResultEmailState.notSent());
    }

    public static ApplicationSummaryResponse from(Application application, ResultEmailState emailState) {
        return new ApplicationSummaryResponse(
                application.getId(),
                application.getGeneration().getId(),
                application.getGeneration().getName(),
                application.getPerson().getId(),
                application.getPerson().getName(),
                application.getPerson().getEmail(),
                application.getPerson().getPhone(),
                application.getPerson().getStudentNumber(),
                application.getPerson().getDiscordName(),
                application.getStatus(),
                application.getSourceType(),
                application.getSubmittedAt(),
                emailState.status(),
                emailState.sentAt()
        );
    }
}
