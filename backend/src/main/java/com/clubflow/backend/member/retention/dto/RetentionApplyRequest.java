package com.clubflow.backend.member.retention.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;
import java.util.UUID;

public record RetentionApplyRequest(
        @NotNull(message = "이전 학기를 선택해 주세요.")
        UUID previousGenerationId,
        @NotNull(message = "대상 학기를 선택해 주세요.")
        UUID targetGenerationId,
        @NotEmpty(message = "이월할 부원을 선택해 주세요.")
        List<UUID> personIds
) {
}
