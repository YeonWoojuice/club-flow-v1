package com.clubflow.backend.member.retention;

import com.clubflow.backend.member.retention.dto.ParsedWorkbookResponse;
import com.clubflow.backend.member.retention.dto.RetentionApplyRequest;
import com.clubflow.backend.member.retention.dto.RetentionApplyResponse;
import com.clubflow.backend.member.retention.dto.RetentionPreviewRequest;
import com.clubflow.backend.member.retention.dto.RetentionPreviewResponse;
import com.clubflow.backend.google.GoogleSheetsService;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

@RestController
@RequestMapping("/api/clubs/{clubId}/member-retention")
public class RetentionImportController {

    private final RetentionImportService retentionImportService;
    private final TabularFileParser tabularFileParser;
    private final GoogleSheetsService googleSheetsService;

    public RetentionImportController(
            RetentionImportService retentionImportService,
            TabularFileParser tabularFileParser,
            GoogleSheetsService googleSheetsService
    ) {
        this.retentionImportService = retentionImportService;
        this.tabularFileParser = tabularFileParser;
        this.googleSheetsService = googleSheetsService;
    }

    @GetMapping("/google-sheet/{spreadsheetId}/tables")
    public ParsedWorkbookResponse readGoogleSheet(
            @AuthenticationPrincipal OidcUser oidcUser,
            @PathVariable UUID clubId,
            @PathVariable String spreadsheetId
    ) {
        retentionImportService.requireClubAccess(oidcUser.getSubject(), clubId);
        return googleSheetsService.readTables(oidcUser.getSubject(), spreadsheetId);
    }

    @PostMapping(value = "/file/parse", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ParsedWorkbookResponse parseFile(
            @AuthenticationPrincipal OidcUser oidcUser,
            @PathVariable UUID clubId,
            @RequestPart("file") MultipartFile file
    ) {
        retentionImportService.requireClubAccess(oidcUser.getSubject(), clubId);
        return tabularFileParser.parse(file);
    }

    @PostMapping("/preview")
    public RetentionPreviewResponse preview(
            @AuthenticationPrincipal OidcUser oidcUser,
            @PathVariable UUID clubId,
            @Valid @RequestBody RetentionPreviewRequest request
    ) {
        return retentionImportService.preview(oidcUser.getSubject(), clubId, request);
    }

    @PostMapping("/apply")
    public RetentionApplyResponse apply(
            @AuthenticationPrincipal OidcUser oidcUser,
            @PathVariable UUID clubId,
            @Valid @RequestBody RetentionApplyRequest request
    ) {
        return retentionImportService.apply(oidcUser.getSubject(), clubId, request);
    }
}
