package com.clubflow.backend.member.retention.dto;

public record RetentionApplyResponse(
        int requestedCount,
        int createdCount,
        int alreadyMemberCount
) {
}
