package com.clubflow.backend.generation.dto;

import com.clubflow.backend.generation.Generation;
import com.clubflow.backend.generation.GenerationStatus;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record GenerationResponse(
        UUID id,
        UUID clubId,
        String name,
        GenerationStatus status,
        LocalDate startDate,
        LocalDate endDate,
        Instant createdAt,
        Instant closedAt
) {
    public static GenerationResponse from(Generation generation) {
        return new GenerationResponse(
                generation.getId(),
                generation.getClub().getId(),
                generation.getName(),
                generation.getStatus(),
                generation.getStartDate(),
                generation.getEndDate(),
                generation.getCreatedAt(),
                generation.getClosedAt()
        );
    }
}
