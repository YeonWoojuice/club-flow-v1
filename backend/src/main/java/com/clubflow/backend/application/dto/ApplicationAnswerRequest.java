package com.clubflow.backend.application.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ApplicationAnswerRequest(
        @NotBlank(message = "질문 키를 입력해 주세요.")
        @Size(max = 100, message = "질문 키는 100자 이하여야 합니다.")
        String questionKey,

        @NotBlank(message = "질문 내용을 입력해 주세요.")
        @Size(max = 500, message = "질문 내용은 500자 이하여야 합니다.")
        String questionLabel,

        @NotBlank(message = "답변을 입력해 주세요.")
        String answerValue
) {
}
