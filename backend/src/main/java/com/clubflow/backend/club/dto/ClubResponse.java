package com.clubflow.backend.club.dto;

import com.clubflow.backend.club.Club;
import com.clubflow.backend.club.ClubStaff;
import com.clubflow.backend.club.ClubStaffRole;
import com.clubflow.backend.club.ClubStaffStatus;

import java.time.Instant;
import java.util.UUID;

public record ClubResponse(
        UUID id,
        String name,
        String description,
        ClubStaffRole role,
        ClubStaffStatus status,
        Instant createdAt
) {
    public static ClubResponse from(Club club, ClubStaff staff) {
        return new ClubResponse(
                club.getId(),
                club.getName(),
                club.getDescription(),
                staff.getRole(),
                staff.getStatus(),
                club.getCreatedAt()
        );
    }
}
