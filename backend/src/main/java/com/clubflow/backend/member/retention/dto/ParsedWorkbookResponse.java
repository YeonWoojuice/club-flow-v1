package com.clubflow.backend.member.retention.dto;

import java.util.List;

public record ParsedWorkbookResponse(List<ParsedTableResponse> tables) {
}
