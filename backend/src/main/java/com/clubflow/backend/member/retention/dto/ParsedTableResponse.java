package com.clubflow.backend.member.retention.dto;

import java.util.List;

public record ParsedTableResponse(
        Long sheetId,
        String name,
        List<String> headers,
        List<List<String>> rows
) {
    public ParsedTableResponse(String name, List<String> headers, List<List<String>> rows) {
        this(null, name, headers, rows);
    }
}
