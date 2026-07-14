package com.clubflow.backend.application.email;

import java.util.List;

record PreparedApplicationResultEmailBatch(
        ApplicationResultEmailBatch batch,
        List<ApplicationResultEmailMessage> messages
) {
}
