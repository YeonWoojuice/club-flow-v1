package com.clubflow.backend.application.importer.source;

import com.clubflow.backend.application.importer.source.dto.ApplicationImportSourceResponse;
import com.clubflow.backend.application.importer.source.dto.ApplicationImportSourceTableResponse;
import com.clubflow.backend.application.importer.source.dto.UpsertApplicationImportSourceRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/clubs/{clubId}/application-import/sources")
public class ApplicationImportSourceController {

    private final ApplicationImportSourceService sourceService;

    public ApplicationImportSourceController(ApplicationImportSourceService sourceService) {
        this.sourceService = sourceService;
    }

    @GetMapping
    public List<ApplicationImportSourceResponse> list(
            @AuthenticationPrincipal OidcUser oidcUser,
            @PathVariable UUID clubId
    ) {
        return sourceService.list(oidcUser.getSubject(), clubId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApplicationImportSourceResponse create(
            @AuthenticationPrincipal OidcUser oidcUser,
            @PathVariable UUID clubId,
            @Valid @RequestBody UpsertApplicationImportSourceRequest request
    ) {
        return sourceService.create(oidcUser.getSubject(), clubId, request);
    }

    @PutMapping("/{sourceId}")
    public ApplicationImportSourceResponse update(
            @AuthenticationPrincipal OidcUser oidcUser,
            @PathVariable UUID clubId,
            @PathVariable UUID sourceId,
            @Valid @RequestBody UpsertApplicationImportSourceRequest request
    ) {
        return sourceService.update(oidcUser.getSubject(), clubId, sourceId, request);
    }

    @DeleteMapping("/{sourceId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(
            @AuthenticationPrincipal OidcUser oidcUser,
            @PathVariable UUID clubId,
            @PathVariable UUID sourceId
    ) {
        sourceService.delete(oidcUser.getSubject(), clubId, sourceId);
    }

    @GetMapping("/{sourceId}/table")
    public ApplicationImportSourceTableResponse readLatest(
            @AuthenticationPrincipal OidcUser oidcUser,
            @PathVariable UUID clubId,
            @PathVariable UUID sourceId
    ) {
        return sourceService.readLatest(oidcUser.getSubject(), clubId, sourceId);
    }
}
