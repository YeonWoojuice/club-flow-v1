package com.clubflow.backend.member;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface GenerationMemberRepository extends JpaRepository<GenerationMember, UUID> {

    Optional<GenerationMember> findByGenerationIdAndPersonId(UUID generationId, UUID personId);

    @Query("""
            select member
            from GenerationMember member
            join fetch member.person person
            where member.generation.id = :generationId
            """)
    List<GenerationMember> findAllByGenerationIdWithPerson(@Param("generationId") UUID generationId);

    @Query("""
            select member
            from GenerationMember member
            join fetch member.generation generation
            join fetch member.person person
            where generation.club.id = :clubId
            order by generation.createdAt desc, person.name asc
            """)
    List<GenerationMember> findAllByClubId(@Param("clubId") UUID clubId);
}
