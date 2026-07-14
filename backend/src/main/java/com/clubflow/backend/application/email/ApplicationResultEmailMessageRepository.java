package com.clubflow.backend.application.email;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Set;
import java.util.UUID;

public interface ApplicationResultEmailMessageRepository
        extends JpaRepository<ApplicationResultEmailMessage, UUID> {

    List<ApplicationResultEmailMessage> findAllByApplication_IdInOrderByCreatedAtDesc(Set<UUID> applicationIds);

    List<ApplicationResultEmailMessage> findAllByBatchId(UUID batchId);
}
