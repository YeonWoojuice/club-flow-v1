package com.clubflow.backend.member;

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
        this.createdAt = now;
        this.updatedAt = now;
    }

    public static GenerationMember createFromAcceptedApplication(Generation generation, Person person) {
        return new GenerationMember(
                generation,
                person,
                MemberJoinedSource.APPLICATION_ACCEPT,
                GenerationMemberStatus.ACTIVE
        );
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

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
