package com.clubflow.backend.application.email.dto;

import com.clubflow.backend.application.email.ApplicationResultEmailMessage;
import com.clubflow.backend.application.email.ApplicationResultEmailMessageStatus;

import java.time.Instant;
import java.util.UUID;

public record ApplicationResultEmailMessageResponse(
        UUID messageId,
        UUID applicationId,
        String memberName,
        String email,
        ApplicationResultEmailMessageStatus status,
        String providerMessageId,
        String errorMessage,
        Instant sentAt
) {
    public static ApplicationResultEmailMessageResponse from(ApplicationResultEmailMessage message) {
        return new ApplicationResultEmailMessageResponse(
                message.getId(), message.getApplicationId(), message.getMemberName(),
                message.getRecipientEmail(), message.getStatus(), message.getProviderMessageId(),
                message.getErrorMessage(), message.getSentAt()
        );
    }
}
