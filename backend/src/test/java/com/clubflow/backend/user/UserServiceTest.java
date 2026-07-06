package com.clubflow.backend.user;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    UserRepository userRepository;

    @InjectMocks
    UserService userService;

    @Test
    void 첫_로그인은_google_sub를_기준으로_회원을_생성한다() {
        given(userRepository.findByGoogleSub("google-sub-001")).willReturn(Optional.empty());
        given(userRepository.save(any(User.class))).willAnswer(invocation -> invocation.getArgument(0));

        User user = userService.synchronizeGoogleUser(
                "google-sub-001",
                "OWNER@example.com",
                "회장",
                null
        );

        assertThat(user.getGoogleSub()).isEqualTo("google-sub-001");
        assertThat(user.getEmail()).isEqualTo("owner@example.com");
        verify(userRepository).save(any(User.class));
    }

    @Test
    void 재로그인은_기존_회원의_프로필을_갱신한다() {
        User existing = User.create("google-sub-001", "old@example.com", "이전 이름", null);
        given(userRepository.findByGoogleSub("google-sub-001")).willReturn(Optional.of(existing));

        User updated = userService.synchronizeGoogleUser(
                "google-sub-001",
                "new@example.com",
                "새 이름",
                "https://example.com/profile.png"
        );

        assertThat(updated).isSameAs(existing);
        assertThat(updated.getEmail()).isEqualTo("new@example.com");
        assertThat(updated.getName()).isEqualTo("새 이름");
    }
}
