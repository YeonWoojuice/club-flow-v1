package com.clubflow.backend.application.email;

import java.util.List;

public interface EmailSender {
    boolean isEnabled();

    List<EmailSendResult> sendBatch(String batchIdempotencyKey, List<EmailSendCommand> commands);
}
