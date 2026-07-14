package com.clubflow.backend.application.email.dto;

import java.util.List;

public record ApplicationResultEmailPreviewResponse(
        int totalCount,
        int sendableCount,
        int excludedCount,
        List<ApplicationResultEmailPreviewRowResponse> rows
) {
    public static ApplicationResultEmailPreviewResponse from(
            List<ApplicationResultEmailPreviewRowResponse> rows
    ) {
        int sendable = (int) rows.stream().filter(ApplicationResultEmailPreviewRowResponse::sendable).count();
        return new ApplicationResultEmailPreviewResponse(
                rows.size(), sendable, rows.size() - sendable, rows
        );
    }
}
