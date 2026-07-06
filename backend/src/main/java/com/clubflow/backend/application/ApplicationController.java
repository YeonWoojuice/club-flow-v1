package com.clubflow.backend.application;

import com.clubflow.backend.application.dto.ApplicationDetailResponse;
import com.clubflow.backend.application.dto.ApplicationSummaryResponse;
import com.clubflow.backend.application.dto.ManualApplicationRequest;
import com.clubflow.backend.application.dto.UpdateApplicationStatusRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api")
public class ApplicationController {

    private final ApplicationService applicationService;

    public ApplicationController(ApplicationService applicationService) {
        this.applicationService = applicationService;
    }

    @GetMapping("/clubs/{clubId}/applications")
    public List<ApplicationSummaryResponse> list(
            @AuthenticationPrincipal OidcUser oidcUser,
            @PathVariable UUID clubId
    ) {
        return applicationService.list(oidcUser.getSubject(), clubId);
    }

    @PostMapping("/clubs/{clubId}/applications/manual")
    @ResponseStatus(HttpStatus.CREATED)
    public ApplicationDetailResponse createManual(
            @AuthenticationPrincipal OidcUser oidcUser,
            @PathVariable UUID clubId,
            @Valid @RequestBody ManualApplicationRequest request
    ) {
        return applicationService.createManual(oidcUser.getSubject(), clubId, request);
    }

    @GetMapping("/applications/{applicationId}")
    public ApplicationDetailResponse get(
            @AuthenticationPrincipal OidcUser oidcUser,
            @PathVariable UUID applicationId
    ) {
        return applicationService.get(oidcUser.getSubject(), applicationId);
    }

    @PatchMapping("/applications/{applicationId}/status")
    public ApplicationDetailResponse changeStatus(
            @AuthenticationPrincipal OidcUser oidcUser,
            @PathVariable UUID applicationId,
            @Valid @RequestBody UpdateApplicationStatusRequest request
    ) {
        return applicationService.changeStatus(
                oidcUser.getSubject(),
                applicationId,
                request.status()
        );
    }
}
