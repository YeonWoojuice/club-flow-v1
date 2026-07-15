package com.clubflow.backend.member;

import com.clubflow.backend.TestcontainersConfiguration;
import com.clubflow.backend.application.ApplicationAnswerRepository;
import com.clubflow.backend.application.ApplicationRepository;
import com.clubflow.backend.application.ApplicationStatusHistoryRepository;
import com.clubflow.backend.club.Club;
import com.clubflow.backend.club.ClubRepository;
import com.clubflow.backend.club.ClubService;
import com.clubflow.backend.club.ClubStaffRepository;
import com.clubflow.backend.club.dto.ClubResponse;
import com.clubflow.backend.club.dto.CreateClubRequest;
import com.clubflow.backend.common.ConflictException;
import com.clubflow.backend.common.ForbiddenException;
import com.clubflow.backend.common.InvalidRequestException;
import com.clubflow.backend.common.NotFoundException;
import com.clubflow.backend.generation.Generation;
import com.clubflow.backend.generation.GenerationRepository;
import com.clubflow.backend.generation.GenerationService;
import com.clubflow.backend.generation.GenerationStatus;
import com.clubflow.backend.generation.dto.CreateGenerationRequest;
import com.clubflow.backend.generation.dto.GenerationResponse;
import com.clubflow.backend.generation.dto.UpdateGenerationRequest;
import com.clubflow.backend.member.dto.ChangeGenerationMemberDuesStatusRequest;
import com.clubflow.backend.member.dto.ChangeGenerationMemberStatusRequest;
import com.clubflow.backend.member.dto.GenerationMemberResponse;
import com.clubflow.backend.member.dto.GenerationMemberStatusHistoryResponse;
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
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@Import(TestcontainersConfiguration.class)
@Testcontainers(disabledWithoutDocker = true)
@SpringBootTest(properties = {
        "spring.security.oauth2.client.registration.google.client-id=test-client",
        "spring.security.oauth2.client.registration.google.client-secret=test-secret"
})
class GenerationMemberStatusIntegrationTests {

    @Autowired GenerationMemberService generationMemberService;
    @Autowired GenerationMemberStatusHistoryRepository statusHistoryRepository;
    @Autowired ApplicationAnswerRepository applicationAnswerRepository;
    @Autowired ApplicationRepository applicationRepository;
    @Autowired ApplicationStatusHistoryRepository applicationStatusHistoryRepository;
    @Autowired GenerationMemberRepository generationMemberRepository;
    @Autowired PersonRepository personRepository;
    @Autowired GenerationRepository generationRepository;
    @Autowired ClubStaffRepository clubStaffRepository;
    @Autowired ClubRepository clubRepository;
    @Autowired UserRepository userRepository;
    @Autowired UserService userService;
    @Autowired ClubService clubService;
    @Autowired GenerationService generationService;

    @BeforeEach
    void setUp() {
        statusHistoryRepository.deleteAll();
        generationMemberRepository.deleteAll();
        applicationAnswerRepository.deleteAll();
        applicationStatusHistoryRepository.deleteAll();
        applicationRepository.deleteAll();
        personRepository.deleteAll();
        generationRepository.deleteAll();
        clubStaffRepository.deleteAll();
        clubRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    void 상태를_변경하면_사유와_변경자가_이력에_저장된다() {
        TestData data = prepareMember();

        generationMemberService.changeStatus(
                data.googleSub(),
                data.member().getId(),
                new ChangeGenerationMemberStatusRequest(GenerationMemberStatus.INACTIVE, "  군 복무  ")
        );
        generationMemberService.changeStatus(
                data.googleSub(),
                data.member().getId(),
                new ChangeGenerationMemberStatusRequest(GenerationMemberStatus.REGULAR, "복학")
        );

        GenerationMember saved = generationMemberRepository.findById(data.member().getId()).orElseThrow();
        List<GenerationMemberStatusHistoryResponse> histories = generationMemberService.getStatusHistory(
                data.googleSub(), data.member().getId()
        );
        assertThat(saved.getStatus()).isEqualTo(GenerationMemberStatus.REGULAR);
        assertThat(histories).hasSize(2);
        assertThat(histories.get(1).previousStatus()).isEqualTo(GenerationMemberStatus.REGULAR);
        assertThat(histories.get(1).newStatus()).isEqualTo(GenerationMemberStatus.INACTIVE);
        assertThat(histories.get(1).reason()).isEqualTo("군 복무");
        assertThat(histories.get(1).changedByName()).isEqualTo("회장");
        assertThat(histories.get(1).changedByUserId()).isNotNull();
        assertThat(histories.get(1).changedAt()).isNotNull();
    }

    @Test
    void 같은_상태를_다시_요청하면_이력을_추가하지_않는다() {
        TestData data = prepareMember();

        generationMemberService.changeStatus(
                data.googleSub(),
                data.member().getId(),
                new ChangeGenerationMemberStatusRequest(GenerationMemberStatus.REGULAR, null)
        );

        assertThat(statusHistoryRepository.count()).isZero();
        assertThat(generationMemberRepository.findById(data.member().getId()).orElseThrow().getStatus())
                .isEqualTo(GenerationMemberStatus.REGULAR);
    }

    @Test
    void 탈퇴에는_사유가_필수이고_탈퇴_후에는_되돌릴_수_없다() {
        TestData data = prepareMember();

        assertThatThrownBy(() -> generationMemberService.changeStatus(
                data.googleSub(),
                data.member().getId(),
                new ChangeGenerationMemberStatusRequest(GenerationMemberStatus.WITHDRAWN, "  ")
        )).isInstanceOf(InvalidRequestException.class);
        assertThat(statusHistoryRepository.count()).isZero();

        generationMemberService.changeStatus(
                data.googleSub(),
                data.member().getId(),
                new ChangeGenerationMemberStatusRequest(GenerationMemberStatus.INACTIVE, "활동 중단")
        );
        generationMemberService.changeStatus(
                data.googleSub(),
                data.member().getId(),
                new ChangeGenerationMemberStatusRequest(GenerationMemberStatus.WITHDRAWN, "개인 사정")
        );

        assertThatThrownBy(() -> generationMemberService.changeStatus(
                data.googleSub(),
                data.member().getId(),
                new ChangeGenerationMemberStatusRequest(GenerationMemberStatus.REGULAR, "복귀")
        )).isInstanceOf(ConflictException.class);
        assertThat(statusHistoryRepository.count()).isEqualTo(2);
        assertThat(generationMemberRepository.findById(data.member().getId()).orElseThrow().getStatus())
                .isEqualTo(GenerationMemberStatus.WITHDRAWN);
    }

    @Test
    void 승인된_운영진이_아니면_다른_동아리_부원_상태를_변경할_수_없다() {
        TestData data = prepareMember();
        userService.synchronizeGoogleUser("other-google-sub", "other@example.com", "외부인", null);

        assertThatThrownBy(() -> generationMemberService.changeStatus(
                "other-google-sub",
                data.member().getId(),
                new ChangeGenerationMemberStatusRequest(GenerationMemberStatus.INACTIVE, null)
        )).isInstanceOf(ForbiddenException.class);

        assertThat(statusHistoryRepository.count()).isZero();
        assertThat(generationMemberRepository.findById(data.member().getId()).orElseThrow().getStatus())
                .isEqualTo(GenerationMemberStatus.REGULAR);

        assertThatThrownBy(() -> generationMemberService.getStatusHistory(
                "other-google-sub", data.member().getId()
        )).isInstanceOf(ForbiddenException.class);
    }

    @Test
    void 회비_상태를_변경하면_변경한_운영진과_시간이_저장된다() {
        TestData data = prepareMember();

        GenerationMemberResponse response = generationMemberService.changeDuesStatus(
                data.googleSub(),
                data.member().getId(),
                new ChangeGenerationMemberDuesStatusRequest(GenerationMemberDuesStatus.PAID)
        );

        GenerationMember saved = generationMemberRepository.findById(data.member().getId()).orElseThrow();
        assertThat(saved.getDuesStatus()).isEqualTo(GenerationMemberDuesStatus.PAID);
        assertThat(saved.getDuesStatusUpdatedAt()).isNotNull();
        assertThat(response.duesStatus()).isEqualTo(GenerationMemberDuesStatus.PAID);
        assertThat(response.duesStatusUpdatedAt()).isNotNull();
        assertThat(response.duesStatusUpdatedByUserId()).isNotNull();
        assertThat(response.duesStatusUpdatedByName()).isEqualTo("회장");
    }

    @Test
    void 새_부원은_회계부원이_확인하기_전까지_회비_상태가_확인_필요이다() {
        TestData data = prepareMember();

        GenerationMemberResponse response = generationMemberService.list(
                data.googleSub(), data.clubId(), data.generationId()
        ).getFirst();

        assertThat(response.duesStatus()).isEqualTo(GenerationMemberDuesStatus.UNKNOWN);
        assertThat(response.duesStatusUpdatedAt()).isNull();
        assertThat(response.duesStatusUpdatedByUserId()).isNull();
        assertThat(response.duesStatusUpdatedByName()).isNull();
    }

    @Test
    void 부원_목록은_선택한_학기의_부원만_반환한다() {
        TestData data = prepareMember();
        Generation generation = generationRepository.findById(data.generationId()).orElseThrow();
        generationService.update(
                data.googleSub(),
                generation.getId(),
                new UpdateGenerationRequest(
                        generation.getName(),
                        generation.getStartDate(),
                        generation.getEndDate(),
                        GenerationStatus.CLOSED
                )
        );
        GenerationResponse nextGeneration = generationService.create(
                data.googleSub(),
                data.clubId(),
                new CreateGenerationRequest(
                        "2026-2 학기", LocalDate.of(2026, 7, 1), LocalDate.of(2026, 12, 31)
                )
        );
        Club club = clubRepository.findById(data.clubId()).orElseThrow();
        Person nextPerson = personRepository.save(Person.create(
                club, "다음 학기 부원", "next@example.com", null, "20230002"
        ));
        generationMemberRepository.save(GenerationMember.createFromRetention(
                generationRepository.findById(nextGeneration.id()).orElseThrow(), nextPerson
        ));

        List<GenerationMemberResponse> firstGenerationMembers = generationMemberService.list(
                data.googleSub(), data.clubId(), data.generationId()
        );

        assertThat(firstGenerationMembers).hasSize(1);
        assertThat(firstGenerationMembers.getFirst().name()).isEqualTo("김민수");
        assertThat(firstGenerationMembers.getFirst().generationId()).isEqualTo(data.generationId());
    }

    @Test
    void 다른_동아리의_학기로_부원_목록을_조회할_수_없다() {
        TestData data = prepareMember();
        ClubResponse otherClub = clubService.createClub(
                data.googleSub(), new CreateClubRequest("다른 동아리", null)
        );
        GenerationResponse otherGeneration = generationService.create(
                data.googleSub(),
                otherClub.id(),
                new CreateGenerationRequest(
                        "다른 동아리 학기", LocalDate.of(2026, 1, 1), LocalDate.of(2026, 6, 30)
                )
        );

        assertThatThrownBy(() -> generationMemberService.list(
                data.googleSub(), data.clubId(), otherGeneration.id()
        )).isInstanceOf(NotFoundException.class);
    }

    private TestData prepareMember() {
        String googleSub = "member-status-owner";
        userService.synchronizeGoogleUser(googleSub, "owner@example.com", "회장", null);
        ClubResponse clubResponse = clubService.createClub(
                googleSub, new CreateClubRequest("테스트 동아리", null)
        );
        GenerationResponse generationResponse = generationService.create(
                googleSub,
                clubResponse.id(),
                new CreateGenerationRequest(
                        "2026-1 학기",
                        LocalDate.of(2026, 1, 1),
                        LocalDate.of(2026, 6, 30)
                )
        );
        Club club = clubRepository.findById(clubResponse.id()).orElseThrow();
        Generation generation = generationRepository.findById(generationResponse.id()).orElseThrow();
        Person person = personRepository.save(Person.create(
                club, "김민수", "member@example.com", null, "20230001"
        ));
        GenerationMember member = generationMemberRepository.save(
                GenerationMember.createFromAcceptedApplication(generation, person)
        );
        return new TestData(googleSub, clubResponse.id(), generationResponse.id(), member);
    }

    private record TestData(
            String googleSub,
            java.util.UUID clubId,
            java.util.UUID generationId,
            GenerationMember member
    ) {
    }
}
