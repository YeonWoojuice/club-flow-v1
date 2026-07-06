package com.clubflow.backend.application;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "application_answers")
public class ApplicationAnswer {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "application_id", nullable = false)
    private Application application;

    @Column(name = "question_key", nullable = false, length = 100)
    private String questionKey;

    @Column(name = "question_label", nullable = false, length = 500)
    private String questionLabel;

    @Column(name = "answer_value", columnDefinition = "TEXT")
    private String answerValue;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "answer_json", columnDefinition = "jsonb")
    private JsonNode answerJson;

    @Column(name = "display_order", nullable = false)
    private int displayOrder;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected ApplicationAnswer() {
    }

    private ApplicationAnswer(
            Application application,
            String questionKey,
            String questionLabel,
            String answerValue,
            int displayOrder
    ) {
        Instant now = Instant.now();
        this.application = application;
        this.questionKey = questionKey.trim();
        this.questionLabel = questionLabel.trim();
        this.answerValue = answerValue.trim();
        this.displayOrder = displayOrder;
        this.createdAt = now;
        this.updatedAt = now;
    }

    public static ApplicationAnswer createText(
            Application application,
            String questionKey,
            String questionLabel,
            String answerValue,
            int displayOrder
    ) {
        return new ApplicationAnswer(
                application,
                questionKey,
                questionLabel,
                answerValue,
                displayOrder
        );
    }

    public UUID getId() {
        return id;
    }

    public Application getApplication() {
        return application;
    }

    public String getQuestionKey() {
        return questionKey;
    }

    public String getQuestionLabel() {
        return questionLabel;
    }

    public String getAnswerValue() {
        return answerValue;
    }

    public JsonNode getAnswerJson() {
        return answerJson;
    }

    public int getDisplayOrder() {
        return displayOrder;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
