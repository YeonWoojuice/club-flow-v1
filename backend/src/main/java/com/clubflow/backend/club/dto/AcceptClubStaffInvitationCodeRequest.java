package com.clubflow.backend.club.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record AcceptClubStaffInvitationCodeRequest(
        @NotBlank(message = "초대 코드를 입력해 주세요.")
        @Pattern(regexp = "[A-Za-z0-9]{8}", message = "초대 코드는 영문과 숫자 8자리입니다.")
        String code
) {
}
