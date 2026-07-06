package com.clubflow.backend.club;

import com.clubflow.backend.user.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "club_staffs")
public class ClubStaff {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "club_id", nullable = false)
    private Club club;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ClubStaffRole role;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ClubStaffStatus status;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected ClubStaff() {
    }

    private ClubStaff(Club club, User user, ClubStaffRole role, ClubStaffStatus status, Instant now) {
        this.club = club;
        this.user = user;
        this.role = role;
        this.status = status;
        this.createdAt = now;
        this.updatedAt = now;
    }

    public static ClubStaff createPresident(Club club, User user) {
        return new ClubStaff(
                club,
                user,
                ClubStaffRole.PRESIDENT,
                ClubStaffStatus.APPROVED,
                Instant.now()
        );
    }

    public UUID getId() {
        return id;
    }

    public Club getClub() {
        return club;
    }

    public User getUser() {
        return user;
    }

    public ClubStaffRole getRole() {
        return role;
    }

    public ClubStaffStatus getStatus() {
        return status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
