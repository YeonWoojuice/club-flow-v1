package com.clubflow.backend.club;

import com.clubflow.backend.club.dto.ClubStaffInvitationResponse;
import com.clubflow.backend.club.dto.ClubStaffResponse;
import com.clubflow.backend.club.dto.AcceptClubStaffInvitationCodeRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/staff-invitations")
public class MyClubStaffInvitationController {

    private final ClubStaffManagementService service;

    public MyClubStaffInvitationController(ClubStaffManagementService service) {
        this.service = service;
    }

    @GetMapping("/me")
    public List<ClubStaffInvitationResponse> listMine(@AuthenticationPrincipal OidcUser oidcUser) {
        return service.listMyInvitations(oidcUser.getSubject());
    }

    @PostMapping("/{invitationId}/accept")
    public ClubStaffResponse accept(
            @AuthenticationPrincipal OidcUser oidcUser,
            @PathVariable UUID invitationId
    ) {
        return service.acceptInvitation(oidcUser.getSubject(), invitationId);
    }

    @PostMapping("/accept-by-code")
    public ClubStaffInvitationResponse acceptByCode(
            @AuthenticationPrincipal OidcUser oidcUser,
            @Valid @RequestBody AcceptClubStaffInvitationCodeRequest request
    ) {
        return service.acceptInvitationByCode(oidcUser.getSubject(), request.code());
    }

    @PostMapping("/{invitationId}/reject")
    public ClubStaffInvitationResponse reject(
            @AuthenticationPrincipal OidcUser oidcUser,
            @PathVariable UUID invitationId
    ) {
        return service.rejectInvitation(oidcUser.getSubject(), invitationId);
    }
}
