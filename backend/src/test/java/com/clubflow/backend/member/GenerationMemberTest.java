package com.clubflow.backend.member;

import com.clubflow.backend.club.Club;
import com.clubflow.backend.common.ConflictException;
import com.clubflow.backend.generation.Generation;
import com.clubflow.backend.person.Person;
import com.clubflow.backend.user.User;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class GenerationMemberTest {

    @Test
    void 회원과_준회원은_서로_변경할_수_있다() {
        GenerationMember member = createMember();

        assertThat(member.changeStatus(GenerationMemberStatus.ASSOCIATE)).isTrue();
        assertThat(member.getStatus()).isEqualTo(GenerationMemberStatus.ASSOCIATE);
        assertThat(member.changeStatus(GenerationMemberStatus.REGULAR)).isTrue();
        assertThat(member.getStatus()).isEqualTo(GenerationMemberStatus.REGULAR);
    }

    @Test
    void 같은_상태로_변경하면_아무것도_바꾸지_않는다() {
        GenerationMember member = createMember();

        assertThat(member.changeStatus(GenerationMemberStatus.REGULAR)).isFalse();
        assertThat(member.getStatus()).isEqualTo(GenerationMemberStatus.REGULAR);
    }

    @Test
    void 탈퇴_상태는_다른_상태로_되돌릴_수_없다() {
        GenerationMember member = createMember();
        member.changeStatus(GenerationMemberStatus.INACTIVE);
        member.changeStatus(GenerationMemberStatus.WITHDRAWN);

        assertThatThrownBy(() -> member.changeStatus(GenerationMemberStatus.REGULAR))
                .isInstanceOf(ConflictException.class)
                .hasMessage("탈퇴한 부원의 상태는 변경할 수 없습니다.");
    }

    @Test
    void 회원은_비활동을_거치지_않고_바로_탈퇴할_수_없다() {
        GenerationMember member = createMember();

        assertThatThrownBy(() -> member.changeStatus(GenerationMemberStatus.WITHDRAWN))
                .isInstanceOf(ConflictException.class)
                .hasMessage("탈퇴 처리를 하려면 먼저 비활동 상태로 변경해 주세요.");
        assertThat(member.getStatus()).isEqualTo(GenerationMemberStatus.REGULAR);
    }

    @Test
    void 새_부원의_회비_상태는_확인_필요로_시작한다() {
        GenerationMember member = createMember();

        assertThat(member.getDuesStatus()).isEqualTo(GenerationMemberDuesStatus.UNKNOWN);
        assertThat(member.getDuesStatusUpdatedAt()).isNull();
        assertThat(member.getDuesStatusUpdatedBy()).isNull();
    }

    @Test
    void 새_부원의_초대_여부는_모두_미완료로_시작하고_변경할_수_있다() {
        GenerationMember member = createMember();

        assertThat(member.isKakaoInvited()).isFalse();
        assertThat(member.isDiscordInvited()).isFalse();
        assertThat(member.changeInvitationStatus(true, false)).isTrue();
        assertThat(member.isKakaoInvited()).isTrue();
        assertThat(member.isDiscordInvited()).isFalse();
        assertThat(member.changeInvitationStatus(true, false)).isFalse();
    }

    private GenerationMember createMember() {
        User user = User.create("member-status-test", "owner@example.com", "회장", null);
        Club club = Club.create("테스트 동아리", null, user);
        Generation generation = Generation.create(
                club,
                "2026-1 학기",
                LocalDate.of(2026, 1, 1),
                LocalDate.of(2026, 6, 30),
                user
        );
        Person person = Person.create(club, "김민수", "member@example.com", null, "20230001");
        return GenerationMember.createFromAcceptedApplication(generation, person);
    }
}
