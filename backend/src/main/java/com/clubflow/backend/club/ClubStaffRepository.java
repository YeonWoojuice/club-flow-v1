package com.clubflow.backend.club;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ClubStaffRepository extends JpaRepository<ClubStaff, UUID> {

    @Query("""
            select staff
            from ClubStaff staff
            join fetch staff.club
            where staff.user.id = :userId
              and staff.status = :status
            order by staff.createdAt asc
            """)
    List<ClubStaff> findAllAccessibleByUserId(
            @Param("userId") UUID userId,
            @Param("status") ClubStaffStatus status
    );

    @Query("""
            select staff
            from ClubStaff staff
            join fetch staff.club
            where staff.club.id = :clubId
              and staff.user.id = :userId
              and staff.status = :status
            """)
    Optional<ClubStaff> findAccessibleClub(
            @Param("clubId") UUID clubId,
            @Param("userId") UUID userId,
            @Param("status") ClubStaffStatus status
    );
}
