package com.clubflow.backend.application.email;

import com.clubflow.backend.application.ApplicationStatus;
import com.clubflow.backend.club.Club;
import com.clubflow.backend.generation.Generation;
import com.clubflow.backend.user.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "application_result_email_batches")
public class ApplicationResultEmailBatch {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "club_id", nullable = false)
    private Club club;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "generation_id", nullable = false)
    private Generation generation;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "requested_by_user_id", nullable = false)
    private User requestedBy;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ApplicationStatus decision;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ApplicationResultEmailBatchStatus status;

    @Column(name = "subject_template", nullable = false, length = 200)
    private String subjectTemplate;

    @Column(name = "body_template", nullable = false, columnDefinition = "TEXT")
    private String bodyTemplate;

    @Column(name = "kakao_link", length = 2048)
    private String kakaoLink;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    protected ApplicationResultEmailBatch() {
    }

    private ApplicationResultEmailBatch(
            Club club,
            Generation generation,
            User requestedBy,
            ApplicationStatus decision,
            String subjectTemplate,
            String bodyTemplate,
            String kakaoLink
    ) {
        this.id = UUID.randomUUID();
        this.club = club;
        this.generation = generation;
        this.requestedBy = requestedBy;
        this.decision = decision;
        this.status = ApplicationResultEmailBatchStatus.PENDING;
        this.subjectTemplate = subjectTemplate;
        this.bodyTemplate = bodyTemplate;
        this.kakaoLink = kakaoLink;
        this.createdAt = Instant.now();
    }

    public static ApplicationResultEmailBatch create(
            Club club,
            Generation generation,
            User requestedBy,
            ApplicationStatus decision,
            String subjectTemplate,
            String bodyTemplate,
            String kakaoLink
    ) {
        return new ApplicationResultEmailBatch(
                club, generation, requestedBy, decision, subjectTemplate, bodyTemplate, kakaoLink
        );
    }

    public void complete(int sentCount, int failedCount, int unknownCount) {
        if (unknownCount > 0) {
            status = ApplicationResultEmailBatchStatus.UNKNOWN;
        } else if (sentCount > 0 && failedCount > 0) {
            status = ApplicationResultEmailBatchStatus.PARTIAL_FAILED;
        } else if (failedCount > 0) {
            status = ApplicationResultEmailBatchStatus.FAILED;
        } else {
            status = ApplicationResultEmailBatchStatus.COMPLETED;
        }
        completedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public UUID getClubId() { return club.getId(); }
    public ApplicationResultEmailBatchStatus getStatus() { return status; }
    public ApplicationStatus getDecision() { return decision; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getCompletedAt() { return completedAt; }
}
