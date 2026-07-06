package com.clubflow.backend.auth.dto;

import com.clubflow.backend.user.User;

import java.time.Instant;
import java.util.UUID;

public record CurrentUserResponse(
        UUID id,
        String email,
        String name,
        String profileImageUrl,
        Instant lastLoginAt
) {
    public static CurrentUserResponse from(User user) {
        return new CurrentUserResponse(
                user.getId(),
                user.getEmail(),
                user.getName(),
                user.getProfileImageUrl(),
                user.getLastLoginAt()
        );
    }
}
