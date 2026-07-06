package com.clubflow.backend.application.dto;

import com.clubflow.backend.application.ApplicationAnswer;
import com.fasterxml.jackson.databind.JsonNode;

import java.util.UUID;

public record ApplicationAnswerResponse(
        UUID id,
        String questionKey,
        String questionLabel,
        String answerValue,
        JsonNode answerJson,
        int displayOrder
) {
    public static ApplicationAnswerResponse from(ApplicationAnswer answer) {
        return new ApplicationAnswerResponse(
                answer.getId(),
                answer.getQuestionKey(),
                answer.getQuestionLabel(),
                answer.getAnswerValue(),
                answer.getAnswerJson(),
                answer.getDisplayOrder()
        );
    }
}
