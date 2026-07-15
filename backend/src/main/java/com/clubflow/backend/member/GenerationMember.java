package com.clubflow.backend.member;

import com.clubflow.backend.generation.Generation;
import com.clubflow.backend.common.ConflictException;
import com.clubflow.backend.person.Person;
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
@Table(name = "generation_members")
public class GenerationMember {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "generation_id", nullable = false)
    private Generation generation;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "person_id", nullable = false)
    private Person person;

    @Enumerated(EnumType.STRING)
    @Column(name = "joined_source", nullable = false, length = 30)
    private MemberJoinedSource joinedSource;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private GenerationMemberStatus status;

    @Enumerated(EnumType.STRING)
    @Column(name = "dues_status", nullable = false, length = 20)
    private GenerationMemberDuesStatus duesStatus;

    @Column(name = "dues_status_updated_at")
    private Instant duesStatusUpdatedAt;

    @Column(name = "kakao_invited", nullable = false)
    private boolean kakaoInvited;

    @Column(name = "discord_invited", nullable = false)
    private boolean discordInvited;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dues_status_updated_by")
    private User duesStatusUpdatedBy;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected GenerationMember() {
    }

    private GenerationMember(
            Generation generation,
            Person person,
            MemberJoinedSource joinedSource,
            GenerationMemberStatus status
    ) {
        Instant now = Instant.now();
        this.generation = generation;
        this.person = person;
        this.joinedSource = joinedSource;
        this.status = status;
        this.duesStatus = GenerationMemberDuesStatus.UNKNOWN;
        this.kakaoInvited = false;
        this.discordInvited = false;
        this.createdAt = now;
        this.updatedAt = now;
    }

    public static GenerationMember createFromAcceptedApplication(Generation generation, Person person) {
        return new GenerationMember(
                generation,
                person,
                MemberJoinedSource.APPLICATION_ACCEPT,
                GenerationMemberStatus.REGULAR
        );
    }

    public static GenerationMember createFromRetention(Generation generation, Person person) {
        return new GenerationMember(
                generation,
                person,
                MemberJoinedSource.RETENTION,
                GenerationMemberStatus.REGULAR
        );
    }

    public boolean changeStatus(GenerationMemberStatus targetStatus) {
        if (status == targetStatus) {
            return false;
        }
        if (status == GenerationMemberStatus.WITHDRAWN) {
            throw new ConflictException("탈퇴한 부원의 상태는 변경할 수 없습니다.");
        }
        if (targetStatus == GenerationMemberStatus.WITHDRAWN
                && status != GenerationMemberStatus.INACTIVE) {
            throw new ConflictException("탈퇴 처리를 하려면 먼저 비활동 상태로 변경해 주세요.");
        }
        this.status = targetStatus;
        this.updatedAt = Instant.now();
        return true;
    }

    public boolean changeDuesStatus(GenerationMemberDuesStatus targetStatus, User changedBy) {
        if (duesStatus == targetStatus) {
            return false;
        }
        this.duesStatus = targetStatus;
        this.duesStatusUpdatedAt = Instant.now();
        this.duesStatusUpdatedBy = changedBy;
        this.updatedAt = this.duesStatusUpdatedAt;
        return true;
    }

    public boolean changeInvitationStatus(boolean kakaoInvited, boolean discordInvited) {
        if (this.kakaoInvited == kakaoInvited && this.discordInvited == discordInvited) {
            return false;
        }
        this.kakaoInvited = kakaoInvited;
        this.discordInvited = discordInvited;
        this.updatedAt = Instant.now();
        return true;
    }

    public UUID getId() {
        return id;
    }

    public Generation getGeneration() {
        return generation;
    }

    public Person getPerson() {
        return person;
    }

    public MemberJoinedSource getJoinedSource() {
        return joinedSource;
    }

    public GenerationMemberStatus getStatus() {
        return status;
    }

    public GenerationMemberDuesStatus getDuesStatus() {
        return duesStatus;
    }

    public Instant getDuesStatusUpdatedAt() {
        return duesStatusUpdatedAt;
    }

    public User getDuesStatusUpdatedBy() {
        return duesStatusUpdatedBy;
    }

    public boolean isKakaoInvited() {
        return kakaoInvited;
    }

    public boolean isDiscordInvited() {
        return discordInvited;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
