package com.clubflow.backend;

import com.clubflow.backend.application.ApplicationAnswerRepository;
import com.clubflow.backend.application.ApplicationRepository;
import com.clubflow.backend.application.ApplicationService;
import com.clubflow.backend.application.ApplicationStatus;
import com.clubflow.backend.application.dto.ApplicationAnswerRequest;
import com.clubflow.backend.application.dto.ApplicationDetailResponse;
import com.clubflow.backend.application.dto.ManualApplicationRequest;
import com.clubflow.backend.club.ClubRepository;
import com.clubflow.backend.club.ClubService;
import com.clubflow.backend.club.ClubStaffRepository;
import com.clubflow.backend.club.ClubStaffRole;
import com.clubflow.backend.club.ClubStaffStatus;
import com.clubflow.backend.club.dto.ClubResponse;
import com.clubflow.backend.club.dto.CreateClubRequest;
import com.clubflow.backend.common.ConflictException;
import com.clubflow.backend.generation.GenerationRepository;
import com.clubflow.backend.generation.GenerationService;
import com.clubflow.backend.generation.dto.CreateGenerationRequest;
import com.clubflow.backend.generation.dto.GenerationResponse;
import com.clubflow.backend.member.GenerationMemberRepository;
import com.clubflow.backend.person.PersonRepository;
import com.clubflow.backend.user.User;
import com.clubflow.backend.user.UserRepository;
import com.clubflow.backend.user.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

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

    @Autowired
    GenerationService generationService;

    @Autowired
    GenerationRepository generationRepository;

    @Autowired
    ApplicationService applicationService;

    @Autowired
    ApplicationRepository applicationRepository;

    @Autowired
    ApplicationAnswerRepository applicationAnswerRepository;

    @Autowired
    PersonRepository personRepository;

    @Autowired
    GenerationMemberRepository generationMemberRepository;

    @BeforeEach
    void setUp() {
        applicationAnswerRepository.deleteAll();
        generationMemberRepository.deleteAll();
        applicationRepository.deleteAll();
        personRepository.deleteAll();
        generationRepository.deleteAll();
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

    @Test
    void 수동_지원자는_이메일을_소문자로_저장하고_합격해도_부원이_중복되지_않는다() {
        userService.synchronizeGoogleUser(
                "google-sub-001",
                "owner@example.com",
                "회장",
                null
        );
        ClubResponse club = clubService.createClub(
                "google-sub-001",
                new CreateClubRequest("아우내", "테스트 동아리")
        );
        GenerationResponse generation = generationService.create(
                "google-sub-001",
                club.id(),
                new CreateGenerationRequest(
                        "2026-2 학기",
                        LocalDate.of(2026, 7, 1),
                        LocalDate.of(2026, 12, 31)
                )
        );
        ApplicationDetailResponse application = applicationService.createManual(
                "google-sub-001",
                club.id(),
                new ManualApplicationRequest(
                        generation.id(),
                        "지원자",
                        "APPLICANT@EXAMPLE.COM",
                        "010-0000-0000",
                        "20260001",
                        List.of(new ApplicationAnswerRequest(
                                "motivation",
                                "지원 동기",
                                "백엔드를 공부하고 싶습니다."
                        ))
                )
        );

        applicationService.changeStatus(
                "google-sub-001",
                application.id(),
                ApplicationStatus.ACCEPTED
        );
        applicationService.changeStatus(
                "google-sub-001",
                application.id(),
                ApplicationStatus.ACCEPTED
        );

        assertThat(personRepository.findAll())
                .extracting(person -> person.getEmail())
                .containsExactly("applicant@example.com");
        assertThat(generationMemberRepository.count()).isEqualTo(1);
        assertThatThrownBy(() -> applicationService.changeStatus(
                "google-sub-001",
                application.id(),
                ApplicationStatus.REJECTED
        )).isInstanceOf(ConflictException.class);
    }
}
