package com.clubflow.backend.member.retention;

import com.clubflow.backend.TestcontainersConfiguration;
import com.clubflow.backend.application.ApplicationAnswerRepository;
import com.clubflow.backend.application.ApplicationRepository;
import com.clubflow.backend.application.ApplicationService;
import com.clubflow.backend.application.ApplicationStatus;
import com.clubflow.backend.application.ApplicationStatusHistoryRepository;
import com.clubflow.backend.application.dto.ApplicationAnswerRequest;
import com.clubflow.backend.application.dto.ApplicationDetailResponse;
import com.clubflow.backend.application.dto.ManualApplicationRequest;
import com.clubflow.backend.club.ClubRepository;
import com.clubflow.backend.club.ClubService;
import com.clubflow.backend.club.ClubStaffRepository;
import com.clubflow.backend.club.dto.ClubResponse;
import com.clubflow.backend.club.dto.CreateClubRequest;
import com.clubflow.backend.generation.GenerationRepository;
import com.clubflow.backend.generation.GenerationService;
import com.clubflow.backend.generation.GenerationStatus;
import com.clubflow.backend.generation.dto.CreateGenerationRequest;
import com.clubflow.backend.generation.dto.GenerationResponse;
import com.clubflow.backend.generation.dto.UpdateGenerationRequest;
import com.clubflow.backend.member.GenerationMember;
import com.clubflow.backend.member.GenerationMemberRepository;
import com.clubflow.backend.member.GenerationMemberService;
import com.clubflow.backend.member.GenerationMemberStatusHistoryRepository;
import com.clubflow.backend.member.GenerationMemberStatus;
import com.clubflow.backend.member.MemberJoinedSource;
import com.clubflow.backend.member.retention.dto.RetentionApplyRequest;
import com.clubflow.backend.member.retention.dto.RetentionApplyResponse;
import com.clubflow.backend.member.retention.dto.RetentionImportRowRequest;
import com.clubflow.backend.member.retention.dto.RetentionPreviewRequest;
import com.clubflow.backend.member.retention.dto.RetentionPreviewResponse;
import com.clubflow.backend.person.Person;
import com.clubflow.backend.person.PersonRepository;
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

@Import(TestcontainersConfiguration.class)
@Testcontainers(disabledWithoutDocker = true)
@SpringBootTest(properties = {
        "spring.security.oauth2.client.registration.google.client-id=test-client",
        "spring.security.oauth2.client.registration.google.client-secret=test-secret"
})
class RetentionImportIntegrationTests {

    @Autowired RetentionImportService retentionImportService;
    @Autowired UserService userService;
    @Autowired ClubService clubService;
    @Autowired GenerationService generationService;
    @Autowired ApplicationService applicationService;
    @Autowired GenerationMemberRepository generationMemberRepository;
    @Autowired GenerationMemberService generationMemberService;
    @Autowired GenerationMemberStatusHistoryRepository statusHistoryRepository;
    @Autowired ApplicationAnswerRepository applicationAnswerRepository;
    @Autowired ApplicationRepository applicationRepository;
    @Autowired ApplicationStatusHistoryRepository applicationStatusHistoryRepository;
    @Autowired PersonRepository personRepository;
    @Autowired GenerationRepository generationRepository;
    @Autowired ClubStaffRepository clubStaffRepository;
    @Autowired ClubRepository clubRepository;
    @Autowired UserRepository userRepository;

    @BeforeEach
    void setUp() {
        statusHistoryRepository.deleteAll();
        applicationAnswerRepository.deleteAll();
        generationMemberRepository.deleteAll();
        applicationStatusHistoryRepository.deleteAll();
        applicationRepository.deleteAll();
        personRepository.deleteAll();
        generationRepository.deleteAll();
        clubStaffRepository.deleteAll();
        clubRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    void 같은_부원을_두_번_이월해도_대상_학기에_RETENTION으로_한_번만_생성한다() {
        TestData data = preparePreviousMemberAndTargetGeneration();
        RetentionPreviewRequest previewRequest = new RetentionPreviewRequest(
                data.previous().id(),
                data.target().id(),
                List.of(new RetentionImportRowRequest(
                        2, "김민수", " MEMBER@example.com ", "20230001", true
                ))
        );

        RetentionPreviewResponse preview = retentionImportService.preview(
                "google-sub-001", data.club().id(), previewRequest
        );
        RetentionApplyRequest applyRequest = new RetentionApplyRequest(
                data.previous().id(), data.target().id(),
                List.of(preview.rows().getFirst().personId())
        );
        RetentionApplyResponse first = retentionImportService.apply(
                "google-sub-001", data.club().id(), applyRequest
        );
        RetentionApplyResponse second = retentionImportService.apply(
                "google-sub-001", data.club().id(), applyRequest
        );

        Person person = personRepository.findByClubIdAndEmail(data.club().id(), "member@example.com").orElseThrow();
        GenerationMember targetMember = generationMemberRepository
                .findByGenerationIdAndPersonId(data.target().id(), person.getId())
                .orElseThrow();
        GenerationMember previousMember = generationMemberRepository
                .findByGenerationIdAndPersonId(data.previous().id(), person.getId())
                .orElseThrow();

        assertThat(preview.readyCount()).isEqualTo(1);
        assertThat(first.createdCount()).isEqualTo(1);
        assertThat(second.createdCount()).isZero();
        assertThat(second.alreadyMemberCount()).isEqualTo(1);
        assertThat(targetMember.getJoinedSource()).isEqualTo(MemberJoinedSource.RETENTION);
        assertThat(targetMember.getStatus()).isEqualTo(GenerationMemberStatus.REGULAR);
        assertThat(previousMember.getJoinedSource()).isEqualTo(MemberJoinedSource.APPLICATION_ACCEPT);
    }

    @Test
    void 같은_원본의_이메일_중복은_대소문자와_공백을_정리해_모두_표시한다() {
        TestData data = preparePreviousMemberAndTargetGeneration();
        RetentionPreviewRequest request = new RetentionPreviewRequest(
                data.previous().id(),
                data.target().id(),
                List.of(
                        new RetentionImportRowRequest(2, "김민수", "member@example.com", null, true),
                        new RetentionImportRowRequest(3, "김민수", " MEMBER@example.com ", null, true)
                )
        );

        RetentionPreviewResponse result = retentionImportService.preview(
                "google-sub-001", data.club().id(), request
        );

        assertThat(result.readyCount()).isZero();
        assertThat(result.duplicateCount()).isEqualTo(2);
        assertThat(result.rows())
                .allMatch(row -> row.status() == RetentionRowStatus.DUPLICATE_IN_SOURCE);
    }

    private TestData preparePreviousMemberAndTargetGeneration() {
        userService.synchronizeGoogleUser("google-sub-001", "owner@example.com", "회장", null);
        ClubResponse club = clubService.createClub(
                "google-sub-001", new CreateClubRequest("아우내", "테스트 동아리")
        );
        GenerationResponse previous = generationService.create(
                "google-sub-001", club.id(),
                new CreateGenerationRequest(
                        "2026-1 학기", LocalDate.of(2026, 1, 1), LocalDate.of(2026, 6, 30)
                )
        );
        ApplicationDetailResponse application = applicationService.createManual(
                "google-sub-001", club.id(),
                new ManualApplicationRequest(
                        previous.id(), "김민수", "member@example.com", "010-0000-0000", "20230001",
                        List.of(new ApplicationAnswerRequest("motivation", "지원 동기", "동아리 활동"))
                )
        );
        applicationService.changeStatus("google-sub-001", application.id(), ApplicationStatus.ACCEPTED, null);
        generationMemberService.ensureAcceptedMember(
                generationRepository.findById(previous.id()).orElseThrow(),
                personRepository.findByClubIdAndEmail(club.id(), "member@example.com").orElseThrow()
        );
        generationService.update(
                "google-sub-001", previous.id(),
                new UpdateGenerationRequest(
                        previous.name(), previous.startDate(), previous.endDate(), GenerationStatus.CLOSED
                )
        );
        GenerationResponse target = generationService.create(
                "google-sub-001", club.id(),
                new CreateGenerationRequest(
                        "2026-2 학기", LocalDate.of(2026, 7, 1), LocalDate.of(2026, 12, 31)
                )
        );
        return new TestData(club, previous, target);
    }

    private record TestData(ClubResponse club, GenerationResponse previous, GenerationResponse target) {
    }
}
