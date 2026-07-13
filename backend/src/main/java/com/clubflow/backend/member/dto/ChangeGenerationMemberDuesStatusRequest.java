package com.clubflow.backend.member.dto;

import com.clubflow.backend.member.GenerationMemberDuesStatus;
import jakarta.validation.constraints.NotNull;

public record ChangeGenerationMemberDuesStatusRequest(
        @NotNull GenerationMemberDuesStatus duesStatus
) {
}
