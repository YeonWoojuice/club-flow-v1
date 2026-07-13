package com.clubflow.backend.application.importer.source;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ApplicationImportSourceRepository extends JpaRepository<ApplicationImportSource, UUID> {

    List<ApplicationImportSource> findAllByClubIdOrderByDisplayNameAsc(UUID clubId);

    Optional<ApplicationImportSource> findByIdAndClubId(UUID id, UUID clubId);
}
