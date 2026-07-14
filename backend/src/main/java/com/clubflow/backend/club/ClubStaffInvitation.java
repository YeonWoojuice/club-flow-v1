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
import java.util.Locale;
import java.util.UUID;

@Entity
@Table(name = "club_staff_invitations")
public class ClubStaffInvitation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "club_id", nullable = false)
    private Club club;

    @Column(nullable = false, length = 255)
    private String email;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ClubStaffRole role;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ClubStaffInvitationStatus status;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "invited_by_user_id", nullable = false)
    private User invitedBy;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "responded_at")
    private Instant respondedAt;

    @Column(name = "invitation_code_hash", length = 64)
    private String invitationCodeHash;

    protected ClubStaffInvitation() {
    }

    private ClubStaffInvitation(Club club, String email, ClubStaffRole role, User invitedBy, String invitationCodeHash) {
        this.club = club;
        this.email = email.trim().toLowerCase(Locale.ROOT);
        this.role = role;
        this.status = ClubStaffInvitationStatus.PENDING;
        this.invitedBy = invitedBy;
        this.invitationCodeHash = invitationCodeHash;
        this.createdAt = Instant.now();
    }

    public static ClubStaffInvitation create(
            Club club,
            String email,
            ClubStaffRole role,
            User invitedBy,
            String invitationCodeHash
    ) {
        if (role == null || role == ClubStaffRole.PRESIDENT) {
            throw new IllegalArgumentException("초대할 수 없는 운영진 역할입니다.");
        }
        return new ClubStaffInvitation(club, email, role, invitedBy, invitationCodeHash);
    }

    public void accept() {
        requirePending();
        status = ClubStaffInvitationStatus.ACCEPTED;
        respondedAt = Instant.now();
    }

    public void reject() {
        requirePending();
        status = ClubStaffInvitationStatus.REJECTED;
        respondedAt = Instant.now();
    }

    public void cancel() {
        if (status == ClubStaffInvitationStatus.CANCELED) {
            return;
        }
        requirePending();
        status = ClubStaffInvitationStatus.CANCELED;
        respondedAt = Instant.now();
    }

    private void requirePending() {
        if (status != ClubStaffInvitationStatus.PENDING) {
            throw new IllegalStateException("이미 처리된 초대입니다.");
        }
    }

    public UUID getId() { return id; }
    public Club getClub() { return club; }
    public String getEmail() { return email; }
    public ClubStaffRole getRole() { return role; }
    public ClubStaffInvitationStatus getStatus() { return status; }
    public User getInvitedBy() { return invitedBy; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getRespondedAt() { return respondedAt; }
    public String getInvitationCodeHash() { return invitationCodeHash; }
}
