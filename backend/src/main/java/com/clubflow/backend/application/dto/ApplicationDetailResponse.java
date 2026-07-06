package com.clubflow.backend.application.dto;

import com.clubflow.backend.application.Application;
import com.clubflow.backend.application.ApplicationAnswer;
import com.clubflow.backend.application.ApplicationSourceType;
import com.clubflow.backend.application.ApplicationStatus;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record ApplicationDetailResponse(
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
        Instant submittedAt,
        List<ApplicationAnswerResponse> applicationAnswers
) {
    public static ApplicationDetailResponse from(
            Application application,
            List<ApplicationAnswer> answers
    ) {
        return new ApplicationDetailResponse(
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
                application.getSubmittedAt(),
                answers.stream().map(ApplicationAnswerResponse::from).toList()
        );
    }
}
