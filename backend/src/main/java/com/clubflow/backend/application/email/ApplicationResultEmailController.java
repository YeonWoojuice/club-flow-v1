package com.clubflow.backend.application.email;

import com.clubflow.backend.application.email.dto.ApplicationResultEmailBatchResponse;
import com.clubflow.backend.application.email.dto.ApplicationResultEmailPreviewResponse;
import com.clubflow.backend.application.email.dto.ApplicationResultEmailRequest;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/clubs/{clubId}/application-result-emails")
public class ApplicationResultEmailController {

    private final ApplicationResultEmailService service;

    public ApplicationResultEmailController(ApplicationResultEmailService service) {
        this.service = service;
    }

    @PostMapping("/preview")
    public ApplicationResultEmailPreviewResponse preview(
            @AuthenticationPrincipal OidcUser oidcUser,
            @PathVariable UUID clubId,
            @Valid @RequestBody ApplicationResultEmailRequest request
    ) {
        return service.preview(oidcUser.getSubject(), clubId, request);
    }

    @PostMapping("/send")
    public ApplicationResultEmailBatchResponse send(
            @AuthenticationPrincipal OidcUser oidcUser,
            @PathVariable UUID clubId,
            @Valid @RequestBody ApplicationResultEmailRequest request
    ) {
        return service.send(oidcUser.getSubject(), clubId, request);
    }

    @GetMapping("/batches/{batchId}")
    public ApplicationResultEmailBatchResponse getBatch(
            @AuthenticationPrincipal OidcUser oidcUser,
            @PathVariable UUID clubId,
            @PathVariable UUID batchId
    ) {
        return service.getBatch(oidcUser.getSubject(), clubId, batchId);
    }
}
