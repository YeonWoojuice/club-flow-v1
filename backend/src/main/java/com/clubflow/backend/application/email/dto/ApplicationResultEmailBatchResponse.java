package com.clubflow.backend.application.email.dto;

import com.clubflow.backend.application.ApplicationStatus;
import com.clubflow.backend.application.email.ApplicationResultEmailBatch;
import com.clubflow.backend.application.email.ApplicationResultEmailBatchStatus;
import com.clubflow.backend.application.email.ApplicationResultEmailMessage;
import com.clubflow.backend.application.email.ApplicationResultEmailMessageStatus;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record ApplicationResultEmailBatchResponse(
        UUID batchId,
        ApplicationStatus decision,
        ApplicationResultEmailBatchStatus status,
        int totalCount,
        int sentCount,
        int failedCount,
        int unknownCount,
        Instant createdAt,
        Instant completedAt,
        List<ApplicationResultEmailMessageResponse> messages
) {
    public static ApplicationResultEmailBatchResponse from(
            ApplicationResultEmailBatch batch,
            List<ApplicationResultEmailMessage> messages
    ) {
        return new ApplicationResultEmailBatchResponse(
                batch.getId(), batch.getDecision(), batch.getStatus(), messages.size(),
                count(messages, ApplicationResultEmailMessageStatus.SENT),
                count(messages, ApplicationResultEmailMessageStatus.FAILED),
                count(messages, ApplicationResultEmailMessageStatus.UNKNOWN),
                batch.getCreatedAt(), batch.getCompletedAt(),
                messages.stream().map(ApplicationResultEmailMessageResponse::from).toList()
        );
    }

    private static int count(
            List<ApplicationResultEmailMessage> messages,
            ApplicationResultEmailMessageStatus status
    ) {
        return (int) messages.stream().filter(message -> message.getStatus() == status).count();
    }
}
