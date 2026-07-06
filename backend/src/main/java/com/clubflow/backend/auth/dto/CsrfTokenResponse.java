package com.clubflow.backend.auth.dto;

public record CsrfTokenResponse(String headerName, String token) {
}
