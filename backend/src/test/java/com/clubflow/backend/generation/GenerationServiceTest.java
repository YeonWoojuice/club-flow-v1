package com.clubflow.backend.generation;

import com.clubflow.backend.club.Club;
import com.clubflow.backend.club.ClubAccessService;
import com.clubflow.backend.common.ConflictException;
import com.clubflow.backend.user.User;
import com.clubflow.backend.user.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class GenerationServiceTest {

    @Mock
    private GenerationRepository generationRepository;
    @Mock
    private ClubAccessService clubAccessService;
    @Mock
    private UserService userService;

    private GenerationService service;

    @BeforeEach
    void setUp() {
        service = new GenerationService(generationRepository, clubAccessService, userService);
    }

    @Test
    void 종료_학기를_활성화하면_기존_활성_학기를_같은_작업에서_종료한다() {
        User owner = User.create("owner-sub", "owner@example.com", "회장", null);
        Club club = Club.create("테스트 동아리", null, owner);
        UUID clubId = UUID.randomUUID();
        ReflectionTestUtils.setField(club, "id", clubId);
        Generation current = generation(club, "26-2");
        Generation target = generation(club, "26-1");
        target.close();
        UUID targetId = UUID.randomUUID();
        ReflectionTestUtils.setField(target, "id", targetId);

        when(generationRepository.findById(targetId)).thenReturn(Optional.of(target));
        when(generationRepository.findAllForUpdateByClubId(clubId)).thenReturn(List.of(current, target));

        var response = service.activate("owner-sub", targetId);

        assertThat(current.getStatus()).isEqualTo(GenerationStatus.CLOSED);
        assertThat(current.getClosedAt()).isNotNull();
        assertThat(target.getStatus()).isEqualTo(GenerationStatus.ACTIVE);
        assertThat(target.getClosedAt()).isNull();
        assertThat(response.status()).isEqualTo(GenerationStatus.ACTIVE);
    }

    @Test
    void 이미_활성인_학기는_다시_활성화하지_않는다() {
        User owner = User.create("owner-sub", "owner@example.com", "회장", null);
        Club club = Club.create("테스트 동아리", null, owner);
        UUID clubId = UUID.randomUUID();
        ReflectionTestUtils.setField(club, "id", clubId);
        Generation target = generation(club, "26-1");
        UUID targetId = UUID.randomUUID();
        ReflectionTestUtils.setField(target, "id", targetId);

        when(generationRepository.findById(targetId)).thenReturn(Optional.of(target));
        when(generationRepository.findAllForUpdateByClubId(clubId)).thenReturn(List.of(target));

        assertThatThrownBy(() -> service.activate("owner-sub", targetId))
                .isInstanceOf(ConflictException.class)
                .hasMessage("이미 활성 상태인 학기입니다.");
    }

    private Generation generation(Club club, String name) {
        return Generation.create(
                club, name, LocalDate.of(2026, 1, 1), LocalDate.of(2026, 6, 30),
                User.create("creator-" + name, name + "@example.com", "운영진", null)
        );
    }
}
