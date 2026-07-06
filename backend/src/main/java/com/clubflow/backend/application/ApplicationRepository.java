package com.clubflow.backend.application;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface ApplicationRepository extends JpaRepository<Application, UUID> {

    boolean existsByGenerationIdAndPersonId(UUID generationId, UUID personId);

    @Query("""
            select application
            from Application application
            join fetch application.generation generation
            join fetch application.person person
            where generation.club.id = :clubId
            order by application.submittedAt desc
            """)
    List<Application> findAllByClubId(@Param("clubId") UUID clubId);
}
