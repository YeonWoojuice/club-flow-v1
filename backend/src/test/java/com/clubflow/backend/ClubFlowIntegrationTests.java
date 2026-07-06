package com.clubflow.backend;

import com.clubflow.backend.club.ClubRepository;
import com.clubflow.backend.club.ClubService;
import com.clubflow.backend.club.ClubStaffRepository;
import com.clubflow.backend.club.ClubStaffRole;
import com.clubflow.backend.club.ClubStaffStatus;
import com.clubflow.backend.club.dto.ClubResponse;
import com.clubflow.backend.club.dto.CreateClubRequest;
import com.clubflow.backend.user.User;
import com.clubflow.backend.user.UserRepository;
import com.clubflow.backend.user.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@Import(TestcontainersConfiguration.class)
@Testcontainers(disabledWithoutDocker = true)
@SpringBootTest(properties = {
        "spring.security.oauth2.client.registration.google.client-id=test-client",
        "spring.security.oauth2.client.registration.google.client-secret=test-secret"
})
class ClubFlowIntegrationTests {

    @Autowired
    UserService userService;

    @Autowired
    ClubService clubService;

    @Autowired
    UserRepository userRepository;

    @Autowired
    ClubRepository clubRepository;

    @Autowired
    ClubStaffRepository clubStaffRepository;

    @BeforeEach
    void setUp() {
        clubStaffRepository.deleteAll();
        clubRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    void 첫_로그인은_회원을_생성하고_재로그인은_같은_회원을_갱신한다() {
        User firstLogin = userService.synchronizeGoogleUser(
                "google-sub-001",
                "owner@example.com",
                "첫 이름",
                "https://example.com/old.png"
        );
        User secondLogin = userService.synchronizeGoogleUser(
                "google-sub-001",
                "OWNER@example.com",
                "변경된 이름",
                "https://example.com/new.png"
        );

        assertThat(userRepository.count()).isEqualTo(1);
        assertThat(secondLogin.getId()).isEqualTo(firstLogin.getId());
        assertThat(secondLogin.getEmail()).isEqualTo("owner@example.com");
        assertThat(secondLogin.getName()).isEqualTo("변경된 이름");
    }

    @Test
    void 동아리_생성자는_승인된_회장_권한을_동시에_받는다() {
        userService.synchronizeGoogleUser(
                "google-sub-001",
                "owner@example.com",
                "회장",
                null
        );

        ClubResponse created = clubService.createClub(
                "google-sub-001",
                new CreateClubRequest("아우내", "테스트 동아리")
        );
        List<ClubResponse> accessibleClubs = clubService.findAccessibleClubs("google-sub-001");

        assertThat(clubRepository.count()).isEqualTo(1);
        assertThat(clubStaffRepository.count()).isEqualTo(1);
        assertThat(created.role()).isEqualTo(ClubStaffRole.PRESIDENT);
        assertThat(created.status()).isEqualTo(ClubStaffStatus.APPROVED);
        assertThat(accessibleClubs).extracting(ClubResponse::id).containsExactly(created.id());
    }
}
