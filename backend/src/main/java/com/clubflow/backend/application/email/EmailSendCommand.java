package com.clubflow.backend.application.email;

import java.util.UUID;

public record EmailSendCommand(
        UUID messageId,
        String idempotencyKey,
        String to,
        String subject,
        String body
) {
}
