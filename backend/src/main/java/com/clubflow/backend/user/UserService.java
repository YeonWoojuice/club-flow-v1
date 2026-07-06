package com.clubflow.backend.user;

import com.clubflow.backend.common.NotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

@Service
@Transactional(readOnly = true)
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Transactional
    public User synchronizeGoogleUser(String googleSub, String email, String name, String profileImageUrl) {
        String normalizedEmail = email.trim().toLowerCase(Locale.ROOT);
        return userRepository.findByGoogleSub(googleSub)
                .map(user -> {
                    user.updateGoogleProfile(normalizedEmail, name, profileImageUrl);
                    return user;
                })
                .orElseGet(() -> userRepository.save(User.create(
                        googleSub,
                        normalizedEmail,
                        name,
                        profileImageUrl
                )));
    }

    public User getByGoogleSub(String googleSub) {
        return userRepository.findByGoogleSub(googleSub)
                .orElseThrow(() -> new NotFoundException("로그인 사용자 정보를 찾을 수 없습니다."));
    }
}
