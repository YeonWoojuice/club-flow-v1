package com.clubflow.backend.member.retention.dto;

import com.clubflow.backend.member.retention.RetentionRowStatus;

import java.util.List;

public record RetentionPreviewResponse(
        int totalCount,
        int readyCount,
        int notRetainedCount,
        int duplicateCount,
        int invalidCount,
        int alreadyMemberCount,
        List<RetentionPreviewRowResponse> rows
) {
    public static RetentionPreviewResponse from(List<RetentionPreviewRowResponse> rows) {
        return new RetentionPreviewResponse(
                rows.size(),
                count(rows, RetentionRowStatus.READY),
                count(rows, RetentionRowStatus.NOT_RETAINED),
                count(rows, RetentionRowStatus.DUPLICATE_IN_SOURCE),
                count(rows, RetentionRowStatus.INVALID) + count(rows, RetentionRowStatus.NOT_PREVIOUS_MEMBER),
                count(rows, RetentionRowStatus.ALREADY_TARGET_MEMBER),
                rows
        );
    }

    private static int count(List<RetentionPreviewRowResponse> rows, RetentionRowStatus status) {
        return (int) rows.stream().filter(row -> row.status() == status).count();
    }
}
