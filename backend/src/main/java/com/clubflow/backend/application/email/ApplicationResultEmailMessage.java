package com.clubflow.backend.application.email;

import com.clubflow.backend.application.Application;
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
@Table(name = "application_result_email_messages")
public class ApplicationResultEmailMessage {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "batch_id", nullable = false)
    private ApplicationResultEmailBatch batch;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "application_id", nullable = false)
    private Application application;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ApplicationResultEmailMessageStatus status;

    @Column(name = "recipient_email_snapshot", nullable = false, length = 255)
    private String recipientEmail;

    @Column(name = "member_name_snapshot", nullable = false, length = 100)
    private String memberName;

    @Column(name = "discord_name_snapshot", length = 100)
    private String discordName;

    @Column(name = "club_name_snapshot", nullable = false, length = 100)
    private String clubName;

    @Column(name = "kakao_link_snapshot", length = 2048)
    private String kakaoLink;

    @Column(name = "subject_snapshot", nullable = false, length = 200)
    private String subject;

    @Column(name = "body_snapshot", nullable = false, columnDefinition = "TEXT")
    private String body;

    @Column(name = "idempotency_key", nullable = false, length = 100)
    private String idempotencyKey;

    @Column(name = "provider_message_id", length = 255)
    private String providerMessageId;

    @Column(name = "error_message", length = 500)
    private String errorMessage;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "sent_at")
    private Instant sentAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected ApplicationResultEmailMessage() {
    }

    private ApplicationResultEmailMessage(
            ApplicationResultEmailBatch batch,
            Application application,
            String recipientEmail,
            String memberName,
            String discordName,
            String clubName,
            String kakaoLink,
            String subject,
            String body
    ) {
        Instant now = Instant.now();
        this.id = UUID.randomUUID();
        this.batch = batch;
        this.application = application;
        this.status = ApplicationResultEmailMessageStatus.PENDING;
        this.recipientEmail = recipientEmail;
        this.memberName = memberName;
        this.discordName = discordName;
        this.clubName = clubName;
        this.kakaoLink = kakaoLink;
        this.subject = subject;
        this.body = body;
        this.idempotencyKey = "application-result/" + id;
        this.createdAt = now;
        this.updatedAt = now;
    }

    public static ApplicationResultEmailMessage create(
            ApplicationResultEmailBatch batch,
            Application application,
            String kakaoLink,
            String subject,
            String body
    ) {
        return new ApplicationResultEmailMessage(
                batch,
                application,
                application.getPerson().getEmail(),
                application.getPerson().getName(),
                application.getPerson().getDiscordName(),
                application.getGeneration().getClub().getName(),
                kakaoLink,
                subject,
                body
        );
    }

    public void apply(EmailSendResult result) {
        this.status = result.status();
        this.providerMessageId = result.providerMessageId();
        this.errorMessage = truncate(result.errorMessage());
        this.updatedAt = Instant.now();
        this.sentAt = result.status() == ApplicationResultEmailMessageStatus.SENT ? updatedAt : null;
    }

    private static String truncate(String value) {
        if (value == null) return null;
        return value.length() <= 500 ? value : value.substring(0, 500);
    }

    public UUID getId() { return id; }
    public UUID getApplicationId() { return application.getId(); }
    public ApplicationResultEmailMessageStatus getStatus() { return status; }
    public String getRecipientEmail() { return recipientEmail; }
    public String getMemberName() { return memberName; }
    public String getSubject() { return subject; }
    public String getBody() { return body; }
    public String getIdempotencyKey() { return idempotencyKey; }
    public String getProviderMessageId() { return providerMessageId; }
    public String getErrorMessage() { return errorMessage; }
    public Instant getSentAt() { return sentAt; }
}
