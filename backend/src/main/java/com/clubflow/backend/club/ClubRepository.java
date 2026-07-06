package com.clubflow.backend.club;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface ClubRepository extends JpaRepository<Club, UUID> {
}
