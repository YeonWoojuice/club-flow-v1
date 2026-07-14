package com.clubflow.backend.application.email;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;
import java.util.Optional;

public interface ApplicationResultEmailBatchRepository
        extends JpaRepository<ApplicationResultEmailBatch, UUID> {
    Optional<ApplicationResultEmailBatch> findByIdAndClubId(UUID id, UUID clubId);
}
