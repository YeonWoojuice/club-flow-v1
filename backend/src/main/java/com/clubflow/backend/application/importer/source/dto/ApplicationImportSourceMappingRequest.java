package com.clubflow.backend.application.importer.source.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ApplicationImportSourceMappingRequest(
        @NotBlank(message = "이름 열을 선택해 주세요.")
        @Size(max = 255, message = "이름 열 제목은 255자 이하여야 합니다.")
        String nameHeader,

        @NotBlank(message = "이메일 열을 선택해 주세요.")
        @Size(max = 255, message = "이메일 열 제목은 255자 이하여야 합니다.")
        String emailHeader,

        @NotBlank(message = "학번 열을 선택해 주세요.")
        @Size(max = 255, message = "학번 열 제목은 255자 이하여야 합니다.")
        String studentNumberHeader,

        @Size(max = 255, message = "전화번호 열 제목은 255자 이하여야 합니다.")
        String phoneHeader,

        @Size(max = 255, message = "제출일시 열 제목은 255자 이하여야 합니다.")
        String submittedAtHeader
) {
}
