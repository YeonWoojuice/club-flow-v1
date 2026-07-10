package com.clubflow.backend.google;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface GoogleConnectionRepository extends JpaRepository<GoogleConnection, UUID> {
    Optional<GoogleConnection> findByUserId(UUID userId);
}
