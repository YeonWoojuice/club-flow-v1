package com.clubflow.backend.application.email;

import java.util.UUID;

public record EmailSendResult(
        UUID messageId,
        ApplicationResultEmailMessageStatus status,
        String providerMessageId,
        String errorMessage
) {
    public static EmailSendResult sent(UUID messageId, String providerMessageId) {
        return new EmailSendResult(messageId, ApplicationResultEmailMessageStatus.SENT, providerMessageId, null);
    }

    public static EmailSendResult failed(UUID messageId, String errorMessage) {
        return new EmailSendResult(messageId, ApplicationResultEmailMessageStatus.FAILED, null, errorMessage);
    }

    public static EmailSendResult unknown(UUID messageId, String errorMessage) {
        return new EmailSendResult(messageId, ApplicationResultEmailMessageStatus.UNKNOWN, null, errorMessage);
    }
}
