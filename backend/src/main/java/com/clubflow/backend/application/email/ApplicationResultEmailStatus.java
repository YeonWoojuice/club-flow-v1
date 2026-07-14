package com.clubflow.backend.application.email;

public enum ApplicationResultEmailStatus {
    NOT_SENT,
    PENDING,
    SENT,
    FAILED,
    UNKNOWN;

    static ApplicationResultEmailStatus from(ApplicationResultEmailMessageStatus status) {
        return valueOf(status.name());
    }
}
