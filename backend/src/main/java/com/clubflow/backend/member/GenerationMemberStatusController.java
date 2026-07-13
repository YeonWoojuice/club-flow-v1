package com.clubflow.backend.member;

import com.clubflow.backend.member.dto.ChangeGenerationMemberStatusRequest;
import com.clubflow.backend.member.dto.ChangeGenerationMemberDuesStatusRequest;
import com.clubflow.backend.member.dto.GenerationMemberResponse;
import com.clubflow.backend.member.dto.GenerationMemberStatusHistoryResponse;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/generation-members/{memberId}")
public class GenerationMemberStatusController {

    private final GenerationMemberService generationMemberService;

    public GenerationMemberStatusController(GenerationMemberService generationMemberService) {
        this.generationMemberService = generationMemberService;
    }

    @PatchMapping("/status")
    public GenerationMemberResponse changeStatus(
            @AuthenticationPrincipal OidcUser oidcUser,
            @PathVariable UUID memberId,
            @Valid @RequestBody ChangeGenerationMemberStatusRequest request
    ) {
        return generationMemberService.changeStatus(oidcUser.getSubject(), memberId, request);
    }

    @PatchMapping("/dues-status")
    public GenerationMemberResponse changeDuesStatus(
            @AuthenticationPrincipal OidcUser oidcUser,
            @PathVariable UUID memberId,
            @Valid @RequestBody ChangeGenerationMemberDuesStatusRequest request
    ) {
        return generationMemberService.changeDuesStatus(oidcUser.getSubject(), memberId, request);
    }

    @GetMapping("/status-history")
    public List<GenerationMemberStatusHistoryResponse> getStatusHistory(
            @AuthenticationPrincipal OidcUser oidcUser,
            @PathVariable UUID memberId
    ) {
        return generationMemberService.getStatusHistory(oidcUser.getSubject(), memberId);
    }
}
