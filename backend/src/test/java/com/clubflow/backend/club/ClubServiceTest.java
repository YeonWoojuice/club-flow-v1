package com.clubflow.backend.club;

import com.clubflow.backend.club.dto.ClubResponse;
import com.clubflow.backend.club.dto.CreateClubRequest;
import com.clubflow.backend.user.User;
import com.clubflow.backend.user.UserService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class ClubServiceTest {

    @Mock
    ClubRepository clubRepository;

    @Mock
    ClubStaffRepository clubStaffRepository;

    @Mock
    UserService userService;

    @InjectMocks
    ClubService clubService;

    @Test
    void 동아리와_승인된_회장_권한을_함께_생성한다() {
        User owner = User.create("google-sub-001", "owner@example.com", "회장", null);
        given(userService.getByGoogleSub("google-sub-001")).willReturn(owner);
        given(clubRepository.save(any(Club.class))).willAnswer(invocation -> invocation.getArgument(0));
        given(clubStaffRepository.save(any(ClubStaff.class))).willAnswer(invocation -> invocation.getArgument(0));

        ClubResponse response = clubService.createClub(
                "google-sub-001",
                new CreateClubRequest("아우내", "테스트 동아리")
        );

        assertThat(response.name()).isEqualTo("아우내");
        assertThat(response.role()).isEqualTo(ClubStaffRole.PRESIDENT);
        assertThat(response.status()).isEqualTo(ClubStaffStatus.APPROVED);
        verify(clubRepository).save(any(Club.class));
        verify(clubStaffRepository).save(any(ClubStaff.class));
    }
}
