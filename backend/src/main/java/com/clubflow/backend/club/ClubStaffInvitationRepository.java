package com.clubflow.backend.club;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ClubStaffInvitationRepository extends JpaRepository<ClubStaffInvitation, UUID> {

    boolean existsByClubIdAndEmailIgnoreCaseAndStatus(UUID clubId, String email, ClubStaffInvitationStatus status);

    @Query("""
            select invitation from ClubStaffInvitation invitation
            join fetch invitation.invitedBy
            where invitation.club.id = :clubId
            order by invitation.createdAt desc
            """)
    List<ClubStaffInvitation> findAllByClubIdWithInviter(@Param("clubId") UUID clubId);

    @Query("""
            select invitation from ClubStaffInvitation invitation
            join fetch invitation.club
            join fetch invitation.invitedBy
            where lower(invitation.email) = lower(:email)
            order by invitation.createdAt desc
            """)
    List<ClubStaffInvitation> findAllByEmailWithClubAndInviter(@Param("email") String email);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select invitation from ClubStaffInvitation invitation
            join fetch invitation.club
            where invitation.id = :id
            """)
    Optional<ClubStaffInvitation> findByIdForUpdate(@Param("id") UUID id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select invitation from ClubStaffInvitation invitation
            join fetch invitation.club
            where invitation.invitationCodeHash = :codeHash
            """)
    Optional<ClubStaffInvitation> findByCodeHashForUpdate(@Param("codeHash") String codeHash);
}
