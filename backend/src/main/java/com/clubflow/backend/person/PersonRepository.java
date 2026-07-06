package com.clubflow.backend.person;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface PersonRepository extends JpaRepository<Person, UUID> {

    Optional<Person> findByClubIdAndEmail(UUID clubId, String email);
}
