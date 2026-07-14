package com.clubflow.backend.application.email;

final class MissingTemplateValueException extends RuntimeException {
    MissingTemplateValueException(String message) {
        super(message);
    }
}
