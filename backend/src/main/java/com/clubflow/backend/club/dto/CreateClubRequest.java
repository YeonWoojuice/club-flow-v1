package com.clubflow.backend.club.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateClubRequest(
        @NotBlank(message = "동아리 이름을 입력해 주세요.")
        @Size(max = 100, message = "동아리 이름은 100자 이하여야 합니다.")
        String name,

        @Size(max = 2000, message = "동아리 설명은 2,000자 이하여야 합니다.")
        String description
) {
}
