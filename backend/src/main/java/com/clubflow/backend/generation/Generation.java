package com.clubflow.backend.generation;

import com.clubflow.backend.club.Club;
import com.clubflow.backend.common.ConflictException;
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
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "generations")
public class Generation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "club_id", nullable = false)
    private Club club;

    @Column(nullable = false, length = 100)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private GenerationStatus status;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "created_by_user_id", nullable = false)
    private User createdBy;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "closed_at")
    private Instant closedAt;

    protected Generation() {
    }

    private Generation(Club club, String name, LocalDate startDate, LocalDate endDate, User createdBy) {
        Instant now = Instant.now();
        this.club = club;
        this.name = name.trim();
        this.status = GenerationStatus.ACTIVE;
        this.startDate = startDate;
        this.endDate = endDate;
        this.createdBy = createdBy;
        this.createdAt = now;
        this.updatedAt = now;
    }

    public static Generation create(
            Club club,
            String name,
            LocalDate startDate,
            LocalDate endDate,
            User createdBy
    ) {
        return new Generation(club, name, startDate, endDate, createdBy);
    }

    public void update(String name, LocalDate startDate, LocalDate endDate, GenerationStatus targetStatus) {
        if (status == GenerationStatus.CLOSED && targetStatus != GenerationStatus.CLOSED) {
            throw new ConflictException("종료된 학기는 학기 활성화 기능으로 전환해 주세요.");
        }
        this.name = name.trim();
        this.startDate = startDate;
        this.endDate = endDate;
        if (status != GenerationStatus.CLOSED && targetStatus == GenerationStatus.CLOSED) {
            this.closedAt = Instant.now();
        }
        this.status = targetStatus;
        this.updatedAt = Instant.now();
    }

    public void close() {
        if (status == GenerationStatus.CLOSED) {
            return;
        }
        Instant now = Instant.now();
        this.status = GenerationStatus.CLOSED;
        this.closedAt = now;
        this.updatedAt = now;
    }

    public void activate() {
        if (status == GenerationStatus.ACTIVE) {
            throw new ConflictException("이미 활성 상태인 학기입니다.");
        }
        this.status = GenerationStatus.ACTIVE;
        this.closedAt = null;
        this.updatedAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public Club getClub() {
        return club;
    }

    public String getName() {
        return name;
    }

    public GenerationStatus getStatus() {
        return status;
    }

    public LocalDate getStartDate() {
        return startDate;
    }

    public LocalDate getEndDate() {
        return endDate;
    }

    public User getCreatedBy() {
        return createdBy;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public Instant getClosedAt() {
        return closedAt;
    }
}
