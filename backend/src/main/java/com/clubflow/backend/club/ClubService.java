package com.clubflow.backend.club;

import com.clubflow.backend.club.dto.ClubResponse;
import com.clubflow.backend.club.dto.CreateClubRequest;
import com.clubflow.backend.common.ForbiddenException;
import com.clubflow.backend.user.User;
import com.clubflow.backend.user.UserService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class ClubService {

    private final ClubRepository clubRepository;
    private final ClubStaffRepository clubStaffRepository;
    private final UserService userService;

    public ClubService(
            ClubRepository clubRepository,
            ClubStaffRepository clubStaffRepository,
            UserService userService
    ) {
        this.clubRepository = clubRepository;
        this.clubStaffRepository = clubStaffRepository;
        this.userService = userService;
    }

    @Transactional
    public ClubResponse createClub(String googleSub, CreateClubRequest request) {
        User currentUser = userService.getByGoogleSub(googleSub);
        Club club = clubRepository.save(Club.create(request.name(), request.description(), currentUser));
        ClubStaff president = clubStaffRepository.save(ClubStaff.createPresident(club, currentUser));
        return ClubResponse.from(club, president);
    }

    public List<ClubResponse> findAccessibleClubs(String googleSub) {
        User currentUser = userService.getByGoogleSub(googleSub);
        return clubStaffRepository.findAllAccessibleByUserId(currentUser.getId(), ClubStaffStatus.APPROVED)
                .stream()
                .map(staff -> ClubResponse.from(staff.getClub(), staff))
                .toList();
    }

    public ClubResponse getAccessibleClub(String googleSub, UUID clubId) {
        User currentUser = userService.getByGoogleSub(googleSub);
        ClubStaff staff = clubStaffRepository.findAccessibleClub(
                        clubId,
                        currentUser.getId(),
                        ClubStaffStatus.APPROVED
                )
                .orElseThrow(() -> new ForbiddenException("해당 동아리에 접근할 권한이 없습니다."));
        return ClubResponse.from(staff.getClub(), staff);
    }
}
