package com.clubflow.backend.application.dto;

import com.clubflow.backend.application.ApplicationStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateApplicationStatusRequest(
        @NotNull(message = "변경할 지원 상태를 입력해 주세요.")
        ApplicationStatus status
) {
}
