package com.clubflow.backend.generation.dto;

import com.clubflow.backend.generation.GenerationStatus;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record UpdateGenerationRequest(
        @NotBlank(message = "학기 이름을 입력해 주세요.")
        @Size(max = 100, message = "학기 이름은 100자 이하여야 합니다.")
        String name,

        @NotNull(message = "시작일을 입력해 주세요.")
        LocalDate startDate,

        @NotNull(message = "종료일을 입력해 주세요.")
        LocalDate endDate,

        @NotNull(message = "학기 상태를 입력해 주세요.")
        GenerationStatus status
) {
    @AssertTrue(message = "종료일은 시작일보다 빠를 수 없습니다.")
    public boolean isDateRangeValid() {
        return startDate == null || endDate == null || !endDate.isBefore(startDate);
    }
}
