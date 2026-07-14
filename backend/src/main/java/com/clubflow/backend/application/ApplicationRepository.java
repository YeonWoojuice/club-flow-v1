package com.clubflow.backend.application;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

public interface ApplicationRepository extends JpaRepository<Application, UUID> {

    boolean existsByGenerationIdAndPersonId(UUID generationId, UUID personId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select application
            from Application application
            join fetch application.generation generation
            join fetch generation.club club
            join fetch application.person person
            where application.id = :applicationId
            """)
    Optional<Application> findByIdForUpdate(@Param("applicationId") UUID applicationId);

    @Query("""
            select application
            from Application application
            join fetch application.generation generation
            join fetch application.person person
            where generation.club.id = :clubId
            order by application.submittedAt desc
            """)
    List<Application> findAllByClubId(@Param("clubId") UUID clubId);

    @Query("""
            select application
            from Application application
            join fetch application.generation generation
            join fetch generation.club club
            join fetch application.person person
            where generation.id = :generationId
              and application.status = :status
            order by application.submittedAt asc
            """)
    List<Application> findAllByGenerationIdAndStatus(
            @Param("generationId") UUID generationId,
            @Param("status") ApplicationStatus status
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select application
            from Application application
            join fetch application.generation generation
            join fetch generation.club club
            join fetch application.person person
            where generation.id = :generationId
              and application.status = :status
            order by application.submittedAt asc
            """)
    List<Application> findAllByGenerationIdAndStatusForUpdate(
            @Param("generationId") UUID generationId,
            @Param("status") ApplicationStatus status
    );

    @Query("""
            select application
            from Application application
            join fetch application.person person
            where application.generation.id = :generationId
              and person.id in :personIds
            """)
    List<Application> findAllByGenerationIdAndPersonIdIn(
            @Param("generationId") UUID generationId,
            @Param("personIds") Set<UUID> personIds
    );
}
