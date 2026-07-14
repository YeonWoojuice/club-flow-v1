package com.clubflow.backend.application.email.dto;

import com.clubflow.backend.application.ApplicationStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public record ApplicationResultEmailRequest(
        @NotNull(message = "학기를 선택해 주세요.")
        UUID generationId,

        @NotNull(message = "합격 또는 불합격 결과를 선택해 주세요.")
        ApplicationStatus decision,

        @NotBlank(message = "메일 제목을 입력해 주세요.")
        @Size(max = 200, message = "메일 제목 템플릿은 200자 이하여야 합니다.")
        String subjectTemplate,

        @NotBlank(message = "메일 내용을 입력해 주세요.")
        @Size(max = 10000, message = "메일 내용은 10000자 이하여야 합니다.")
        String bodyTemplate,

        @Size(max = 2048, message = "카카오톡 링크는 2048자 이하여야 합니다.")
        String kakaoLink
) {
}
