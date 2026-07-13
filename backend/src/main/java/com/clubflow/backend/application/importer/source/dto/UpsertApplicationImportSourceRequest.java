package com.clubflow.backend.application.importer.source.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.util.List;

public record UpsertApplicationImportSourceRequest(
        @NotBlank(message = "저장할 설정 이름을 입력해 주세요.")
        @Size(max = 100, message = "설정 이름은 100자 이하여야 합니다.")
        String displayName,

        @NotBlank(message = "Google Sheet 주소를 입력해 주세요.")
        @Size(max = 255, message = "Google Sheet ID는 255자 이하여야 합니다.")
        @Pattern(regexp = "^[A-Za-z0-9_-]+$", message = "Google Sheet 주소를 확인해 주세요.")
        String spreadsheetId,

        @NotNull(message = "시트 탭을 선택해 주세요.")
        @PositiveOrZero(message = "시트 탭 ID를 확인해 주세요.")
        Long sheetId,

        @NotBlank(message = "시트 탭을 선택해 주세요.")
        @Size(max = 255, message = "시트 탭 이름은 255자 이하여야 합니다.")
        String sheetTitle,

        @NotEmpty(message = "시트의 열 제목을 확인해 주세요.")
        @Size(max = 100, message = "열은 최대 100개까지 저장할 수 있습니다.")
        List<@Size(max = 255, message = "열 제목은 255자 이하여야 합니다.") String> headers,

        @NotNull(message = "열 연결 규칙을 설정해 주세요.")
        @Valid
        ApplicationImportSourceMappingRequest mapping
) {
}
