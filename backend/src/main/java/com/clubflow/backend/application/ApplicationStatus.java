package com.clubflow.backend.application;

public enum ApplicationStatus {
    SUBMITTED,
    REVIEWING,
    ACCEPTED,
    REJECTED,
    CANCELED;

    public boolean isTerminal() {
        return this == ACCEPTED || this == REJECTED || this == CANCELED;
    }
}
