package com.clubflow.backend.club;

import com.clubflow.backend.club.dto.ClubResponse;
import com.clubflow.backend.club.dto.CreateClubRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/clubs")
public class ClubController {

    private final ClubService clubService;

    public ClubController(ClubService clubService) {
        this.clubService = clubService;
    }

    @GetMapping
    public List<ClubResponse> list(@AuthenticationPrincipal OidcUser oidcUser) {
        return clubService.findAccessibleClubs(oidcUser.getSubject());
    }

    @GetMapping("/{clubId}")
    public ClubResponse get(
            @AuthenticationPrincipal OidcUser oidcUser,
            @PathVariable UUID clubId
    ) {
        return clubService.getAccessibleClub(oidcUser.getSubject(), clubId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ClubResponse create(
            @AuthenticationPrincipal OidcUser oidcUser,
            @Valid @RequestBody CreateClubRequest request
    ) {
        return clubService.createClub(oidcUser.getSubject(), request);
    }
}
