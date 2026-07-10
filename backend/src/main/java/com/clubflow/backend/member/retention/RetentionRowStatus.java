package com.clubflow.backend.member.retention;

public enum RetentionRowStatus {
    READY,
    NOT_RETAINED,
    INVALID,
    DUPLICATE_IN_SOURCE,
    NOT_PREVIOUS_MEMBER,
    ALREADY_TARGET_MEMBER
}
