package com.clubflow.backend.member;

import com.clubflow.backend.member.dto.GenerationMemberResponse;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/clubs/{clubId}/members")
public class GenerationMemberController {

    private final GenerationMemberService generationMemberService;

    public GenerationMemberController(GenerationMemberService generationMemberService) {
        this.generationMemberService = generationMemberService;
    }

    @GetMapping
    public List<GenerationMemberResponse> list(
            @AuthenticationPrincipal OidcUser oidcUser,
            @PathVariable UUID clubId,
            @RequestParam UUID generationId
    ) {
        return generationMemberService.list(oidcUser.getSubject(), clubId, generationId);
    }
}
