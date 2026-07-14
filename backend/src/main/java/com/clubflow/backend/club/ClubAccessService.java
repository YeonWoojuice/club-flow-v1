package com.clubflow.backend.club;

import com.clubflow.backend.common.ForbiddenException;
import com.clubflow.backend.user.User;
import com.clubflow.backend.user.UserService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class ClubAccessService {

    private final ClubStaffRepository clubStaffRepository;
    private final UserService userService;

    public ClubAccessService(ClubStaffRepository clubStaffRepository, UserService userService) {
        this.clubStaffRepository = clubStaffRepository;
        this.userService = userService;
    }

    public Club requireAccessibleClub(String googleSub, UUID clubId) {
        User currentUser = userService.getByGoogleSub(googleSub);
        return clubStaffRepository.findAccessibleClub(
                        clubId,
                        currentUser.getId(),
                        ClubStaffStatus.APPROVED
                )
                .map(ClubStaff::getClub)
                .orElseThrow(() -> new ForbiddenException("해당 동아리에 접근할 권한이 없습니다."));
    }

    public ClubStaff requireApplicationResultEmailManager(String googleSub, UUID clubId) {
        User currentUser = userService.getByGoogleSub(googleSub);
        ClubStaff staff = clubStaffRepository.findAccessibleClub(
                        clubId,
                        currentUser.getId(),
                        ClubStaffStatus.APPROVED
                )
                .orElseThrow(() -> new ForbiddenException("해당 동아리에 접근할 권한이 없습니다."));
        if (staff.getRole() != ClubStaffRole.PRESIDENT
                && staff.getRole() != ClubStaffRole.VICE_PRESIDENT) {
            throw new ForbiddenException("회장 또는 부회장만 지원 결과 메일을 발송할 수 있습니다.");
        }
        return staff;
    }
}
