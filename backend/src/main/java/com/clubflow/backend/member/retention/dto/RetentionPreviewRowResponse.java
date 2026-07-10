package com.clubflow.backend.member.retention.dto;

import com.clubflow.backend.member.retention.RetentionRowStatus;

import java.util.UUID;

public record RetentionPreviewRowResponse(
        int rowNumber,
        String name,
        String email,
        String studentNumber,
        UUID personId,
        RetentionRowStatus status,
        String message
) {
}
