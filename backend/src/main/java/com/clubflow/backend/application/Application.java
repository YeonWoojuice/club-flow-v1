package com.clubflow.backend.application;

import com.clubflow.backend.common.ConflictException;
import com.clubflow.backend.generation.Generation;
import com.clubflow.backend.person.Person;
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
@Table(name = "applications")
public class Application {

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
    @Column(nullable = false, length = 20)
    private ApplicationStatus status;

    @Enumerated(EnumType.STRING)
    @Column(name = "source_type", nullable = false, length = 20)
    private ApplicationSourceType sourceType;

    @Column(name = "submitted_at", nullable = false)
    private Instant submittedAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected Application() {
    }

    private Application(Generation generation, Person person, ApplicationSourceType sourceType) {
        Instant now = Instant.now();
        this.generation = generation;
        this.person = person;
        this.status = ApplicationStatus.SUBMITTED;
        this.sourceType = sourceType;
        this.submittedAt = now;
        this.createdAt = now;
        this.updatedAt = now;
    }

    public static Application createManual(Generation generation, Person person) {
        return new Application(generation, person, ApplicationSourceType.MANUAL);
    }

    public void changeStatus(ApplicationStatus targetStatus) {
        if (status == targetStatus) {
            return;
        }
        if (status.isTerminal()) {
            throw new ConflictException("최종 처리된 지원 상태는 변경할 수 없습니다.");
        }
        if (targetStatus == ApplicationStatus.SUBMITTED) {
            throw new ConflictException("지원 상태를 접수 상태로 되돌릴 수 없습니다.");
        }
        this.status = targetStatus;
        this.updatedAt = Instant.now();
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

    public ApplicationStatus getStatus() {
        return status;
    }

    public ApplicationSourceType getSourceType() {
        return sourceType;
    }

    public Instant getSubmittedAt() {
        return submittedAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
