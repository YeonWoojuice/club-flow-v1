package com.clubflow.backend.club;

import com.clubflow.backend.TestcontainersConfiguration;
import com.clubflow.backend.application.ApplicationAnswerRepository;
import com.clubflow.backend.application.ApplicationRepository;
import com.clubflow.backend.club.dto.ChangeClubStaffRoleRequest;
import com.clubflow.backend.club.dto.ClubResponse;
import com.clubflow.backend.club.dto.ClubStaffInvitationResponse;
import com.clubflow.backend.club.dto.ClubStaffResponse;
import com.clubflow.backend.club.dto.CreateClubRequest;
import com.clubflow.backend.club.dto.CreateClubStaffInvitationRequest;
import com.clubflow.backend.common.ConflictException;
import com.clubflow.backend.common.ForbiddenException;
import com.clubflow.backend.common.NotFoundException;
import com.clubflow.backend.generation.GenerationRepository;
import com.clubflow.backend.member.GenerationMemberRepository;
import com.clubflow.backend.member.GenerationMemberStatusHistoryRepository;
import com.clubflow.backend.person.PersonRepository;
import com.clubflow.backend.user.UserRepository;
import com.clubflow.backend.user.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@Import(TestcontainersConfiguration.class)
@Testcontainers(disabledWithoutDocker = true)
@SpringBootTest(properties = {
        "spring.security.oauth2.client.registration.google.client-id=test-client",
        "spring.security.oauth2.client.registration.google.client-secret=test-secret"
})
class ClubStaffManagementIntegrationTests {

    @Autowired ClubStaffManagementService service;
    @Autowired ClubAccessService clubAccessService;
    @Autowired ClubService clubService;
    @Autowired UserService userService;
    @Autowired ClubStaffInvitationRepository invitationRepository;
    @Autowired GenerationMemberStatusHistoryRepository statusHistoryRepository;
    @Autowired ApplicationAnswerRepository applicationAnswerRepository;
    @Autowired GenerationMemberRepository generationMemberRepository;
    @Autowired ApplicationRepository applicationRepository;
    @Autowired PersonRepository personRepository;
    @Autowired GenerationRepository generationRepository;
    @Autowired ClubStaffRepository clubStaffRepository;
    @Autowired ClubRepository clubRepository;
    @Autowired UserRepository userRepository;

    @BeforeEach
    void setUp() {
        invitationRepository.deleteAll();
        statusHistoryRepository.deleteAll();
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
    void 회장은_이메일을_정규화해_초대하고_대기_초대_중복을_막는다() {
        TestClub data = createClub("owner-sub", "owner@example.com", "동아리 A");

        ClubStaffInvitationResponse invitation = service.invite(
                data.ownerSub(), data.club().id(),
                new CreateClubStaffInvitationRequest("  STAFF@Example.COM  ", ClubStaffRole.STAFF)
        );

        assertThat(invitation.email()).isEqualTo("staff@example.com");
        assertThat(invitation.invitationCode()).matches("[A-Z0-9]{8}");
        assertThat(invitation.status()).isEqualTo(ClubStaffInvitationStatus.PENDING);
        assertThatThrownBy(() -> service.invite(
                data.ownerSub(), data.club().id(),
                new CreateClubStaffInvitationRequest("staff@example.com", ClubStaffRole.VICE_PRESIDENT)
        )).isInstanceOf(ConflictException.class);
        assertThat(invitationRepository.count()).isEqualTo(1);
    }

    @Test
    void 초대받은_이메일로_로그인하고_코드를_입력하면_운영진이_된다() {
        TestClub data = createClub("owner-sub", "owner@example.com", "동아리 A");
        userService.synchronizeGoogleUser("staff-sub", "staff@example.com", "운영진", null);
        ClubStaffInvitationResponse invitation = service.invite(
                data.ownerSub(), data.club().id(),
                new CreateClubStaffInvitationRequest("staff@example.com", ClubStaffRole.STAFF)
        );

        ClubStaffInvitationResponse accepted = service.acceptInvitationByCode(
                "staff-sub", invitation.invitationCode().toLowerCase()
        );

        assertThat(accepted.status()).isEqualTo(ClubStaffInvitationStatus.ACCEPTED);
        assertThat(clubStaffRepository.findAllByClubIdWithUser(data.club().id()))
                .anySatisfy(staff -> assertThat(staff.getUser().getEmail()).isEqualTo("staff@example.com"));
        assertThat(invitationRepository.findById(invitation.id()).orElseThrow().getInvitationCodeHash())
                .doesNotContain(invitation.invitationCode());
    }

    @Test
    void 일반_운영진은_다른_운영진을_초대할_수_없다() {
        AcceptedStaff data = createAcceptedStaff();

        assertThatThrownBy(() -> service.invite(
                data.staffSub(), data.club().id(),
                new CreateClubStaffInvitationRequest("next@example.com", ClubStaffRole.STAFF)
        )).isInstanceOf(ForbiddenException.class);
    }

    @Test
    void 이미_승인된_운영진은_다시_초대할_수_없다() {
        AcceptedStaff data = createAcceptedStaff();

        assertThatThrownBy(() -> service.invite(
                data.ownerSub(), data.club().id(),
                new CreateClubStaffInvitationRequest("STAFF@example.com", ClubStaffRole.STAFF)
        )).isInstanceOf(ConflictException.class);
    }

    @Test
    void 로그인_이메일과_다른_초대는_수락하거나_거절할_수_없다() {
        TestClub data = createClub("owner-sub", "owner@example.com", "동아리 A");
        ClubStaffInvitationResponse invitation = service.invite(
                data.ownerSub(), data.club().id(),
                new CreateClubStaffInvitationRequest("invitee@example.com", ClubStaffRole.STAFF)
        );
        userService.synchronizeGoogleUser("other-sub", "other@example.com", "다른 사용자", null);

        assertThatThrownBy(() -> service.acceptInvitation("other-sub", invitation.id()))
                .isInstanceOf(ForbiddenException.class);
        assertThatThrownBy(() -> service.rejectInvitation("other-sub", invitation.id()))
                .isInstanceOf(ForbiddenException.class);
        assertThat(invitationRepository.findById(invitation.id()).orElseThrow().getStatus())
                .isEqualTo(ClubStaffInvitationStatus.PENDING);
    }

    @Test
    void 초대를_동시에_두_번_수락해도_승인된_운영진은_한_건이다() throws Exception {
        TestClub data = createClub("owner-sub", "owner@example.com", "동아리 A");
        userService.synchronizeGoogleUser("staff-sub", "staff@example.com", "운영진", null);
        ClubStaffInvitationResponse invitation = service.invite(
                data.ownerSub(), data.club().id(),
                new CreateClubStaffInvitationRequest("staff@example.com", ClubStaffRole.STAFF)
        );

        ExecutorService executor = Executors.newFixedThreadPool(2);
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);
        try {
            Future<ClubStaffResponse> firstResult = executor.submit(() -> {
                ready.countDown();
                start.await();
                return service.acceptInvitation("staff-sub", invitation.id());
            });
            Future<ClubStaffResponse> secondResult = executor.submit(() -> {
                ready.countDown();
                start.await();
                return service.acceptInvitation("staff-sub", invitation.id());
            });
            assertThat(ready.await(5, TimeUnit.SECONDS)).isTrue();
            start.countDown();

            ClubStaffResponse first = firstResult.get(10, TimeUnit.SECONDS);
            ClubStaffResponse second = secondResult.get(10, TimeUnit.SECONDS);

            assertThat(first.id()).isEqualTo(second.id());
            assertThat(first.status()).isEqualTo(ClubStaffStatus.APPROVED);
            assertThat(clubStaffRepository.findAllByClubIdWithUser(data.club().id()))
                    .filteredOn(staff -> staff.getUser().getEmail().equals("staff@example.com"))
                    .hasSize(1);
        } finally {
            executor.shutdownNow();
        }
    }

    @Test
    void 초대_거절과_취소는_같은_요청에_멱등이고_다른_처리로_바꿀_수_없다() {
        TestClub data = createClub("owner-sub", "owner@example.com", "동아리 A");
        userService.synchronizeGoogleUser("staff-sub", "staff@example.com", "운영진", null);
        ClubStaffInvitationResponse rejected = service.invite(
                data.ownerSub(), data.club().id(),
                new CreateClubStaffInvitationRequest("staff@example.com", ClubStaffRole.STAFF)
        );

        service.rejectInvitation("staff-sub", rejected.id());
        service.rejectInvitation("staff-sub", rejected.id());
        assertThatThrownBy(() -> service.cancelInvitation(
                data.ownerSub(), data.club().id(), rejected.id()
        )).isInstanceOf(ConflictException.class);

        ClubStaffInvitationResponse canceled = service.invite(
                data.ownerSub(), data.club().id(),
                new CreateClubStaffInvitationRequest("staff@example.com", ClubStaffRole.STAFF)
        );
        service.cancelInvitation(data.ownerSub(), data.club().id(), canceled.id());
        service.cancelInvitation(data.ownerSub(), data.club().id(), canceled.id());
        assertThatThrownBy(() -> service.acceptInvitation("staff-sub", canceled.id()))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    void 회장은_역할을_변경하고_권한을_멱등으로_해제할_수_있다() {
        AcceptedStaff data = createAcceptedStaff();

        ClubStaffResponse changed = service.changeRole(
                data.ownerSub(), data.club().id(), data.staff().id(),
                new ChangeClubStaffRoleRequest(ClubStaffRole.VICE_PRESIDENT)
        );
        ClubStaffResponse revoked = service.revoke(data.ownerSub(), data.club().id(), data.staff().id());
        ClubStaffResponse revokedAgain = service.revoke(data.ownerSub(), data.club().id(), data.staff().id());

        assertThat(changed.role()).isEqualTo(ClubStaffRole.VICE_PRESIDENT);
        assertThat(revoked.status()).isEqualTo(ClubStaffStatus.REVOKED);
        assertThat(revokedAgain.status()).isEqualTo(ClubStaffStatus.REVOKED);
        assertThatThrownBy(() -> clubAccessService.requireAccessibleClub(
                data.staffSub(), data.club().id()))
                .isInstanceOf(ForbiddenException.class);

        List<ClubStaffResponse> listed = service.listStaff(data.ownerSub(), data.club().id());
        assertThat(listed).anySatisfy(staff -> {
            assertThat(staff.id()).isEqualTo(data.staff().id());
            assertThat(staff.status()).isEqualTo(ClubStaffStatus.REVOKED);
        });
    }

    @Test
    void 해제된_운영진이_재초대를_수락하면_기존_행이_다시_승인된다() {
        AcceptedStaff data = createAcceptedStaff();
        service.revoke(data.ownerSub(), data.club().id(), data.staff().id());

        ClubStaffInvitationResponse invitation = service.invite(
                data.ownerSub(), data.club().id(),
                new CreateClubStaffInvitationRequest("staff@example.com", ClubStaffRole.VICE_PRESIDENT)
        );
        ClubStaffResponse acceptedAgain = service.acceptInvitation(data.staffSub(), invitation.id());

        assertThat(acceptedAgain.id()).isEqualTo(data.staff().id());
        assertThat(acceptedAgain.status()).isEqualTo(ClubStaffStatus.APPROVED);
        assertThat(acceptedAgain.role()).isEqualTo(ClubStaffRole.VICE_PRESIDENT);
        assertThat(clubStaffRepository.findAllByClubIdWithUser(data.club().id())).hasSize(2);
    }

    @Test
    void 회장_권한은_변경하거나_해제할_수_없다() {
        TestClub data = createClub("owner-sub", "owner@example.com", "동아리 A");
        ClubStaffResponse president = service.listStaff(data.ownerSub(), data.club().id()).getFirst();

        assertThatThrownBy(() -> service.changeRole(
                data.ownerSub(), data.club().id(), president.id(),
                new ChangeClubStaffRoleRequest(ClubStaffRole.STAFF)
        )).isInstanceOf(ConflictException.class);
        assertThatThrownBy(() -> service.revoke(data.ownerSub(), data.club().id(), president.id()))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    void 다른_동아리의_운영진과_초대는_변경할_수_없다() {
        TestClub first = createClub("first-owner", "first@example.com", "첫 동아리");
        TestClub second = createClub("second-owner", "second@example.com", "둘째 동아리");
        ClubStaffResponse secondPresident = service.listStaff(second.ownerSub(), second.club().id()).getFirst();
        ClubStaffInvitationResponse secondInvitation = service.invite(
                second.ownerSub(), second.club().id(),
                new CreateClubStaffInvitationRequest("staff@example.com", ClubStaffRole.STAFF)
        );

        assertThatThrownBy(() -> service.revoke(
                first.ownerSub(), first.club().id(), secondPresident.id()))
                .isInstanceOf(NotFoundException.class);
        assertThatThrownBy(() -> service.cancelInvitation(
                first.ownerSub(), first.club().id(), secondInvitation.id()))
                .isInstanceOf(ForbiddenException.class);
    }

    private AcceptedStaff createAcceptedStaff() {
        TestClub data = createClub("owner-sub", "owner@example.com", "동아리 A");
        userService.synchronizeGoogleUser("staff-sub", "staff@example.com", "운영진", null);
        ClubStaffInvitationResponse invitation = service.invite(
                data.ownerSub(), data.club().id(),
                new CreateClubStaffInvitationRequest("staff@example.com", ClubStaffRole.STAFF)
        );
        ClubStaffResponse staff = service.acceptInvitation("staff-sub", invitation.id());
        return new AcceptedStaff(data.ownerSub(), "staff-sub", data.club(), staff);
    }

    private TestClub createClub(String ownerSub, String ownerEmail, String clubName) {
        userService.synchronizeGoogleUser(ownerSub, ownerEmail, clubName + " 회장", null);
        ClubResponse club = clubService.createClub(ownerSub, new CreateClubRequest(clubName, null));
        return new TestClub(ownerSub, club);
    }

    private record TestClub(String ownerSub, ClubResponse club) {
    }

    private record AcceptedStaff(
            String ownerSub,
            String staffSub,
            ClubResponse club,
            ClubStaffResponse staff
    ) {
    }
}
