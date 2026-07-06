package com.clubflow.backend.generation;

import com.clubflow.backend.generation.dto.CreateGenerationRequest;
import com.clubflow.backend.generation.dto.GenerationResponse;
import com.clubflow.backend.generation.dto.UpdateGenerationRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
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
@RequestMapping("/api")
public class GenerationController {

    private final GenerationService generationService;

    public GenerationController(GenerationService generationService) {
        this.generationService = generationService;
    }

    @GetMapping("/clubs/{clubId}/generations")
    public List<GenerationResponse> list(
            @AuthenticationPrincipal OidcUser oidcUser,
            @PathVariable UUID clubId
    ) {
        return generationService.list(oidcUser.getSubject(), clubId);
    }

    @PostMapping("/clubs/{clubId}/generations")
    @ResponseStatus(HttpStatus.CREATED)
    public GenerationResponse create(
            @AuthenticationPrincipal OidcUser oidcUser,
            @PathVariable UUID clubId,
            @Valid @RequestBody CreateGenerationRequest request
    ) {
        return generationService.create(oidcUser.getSubject(), clubId, request);
    }

    @PutMapping("/generations/{generationId}")
    public GenerationResponse update(
            @AuthenticationPrincipal OidcUser oidcUser,
            @PathVariable UUID generationId,
            @Valid @RequestBody UpdateGenerationRequest request
    ) {
        return generationService.update(oidcUser.getSubject(), generationId, request);
    }
}
