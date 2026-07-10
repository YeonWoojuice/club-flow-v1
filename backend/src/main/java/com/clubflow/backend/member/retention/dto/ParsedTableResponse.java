package com.clubflow.backend.member.retention.dto;

import java.util.List;

public record ParsedTableResponse(
        String name,
        List<String> headers,
        List<List<String>> rows
) {
}
