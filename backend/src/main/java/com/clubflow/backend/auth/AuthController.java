package com.clubflow.backend.auth;

import com.clubflow.backend.auth.dto.CsrfTokenResponse;
import com.clubflow.backend.auth.dto.CurrentUserResponse;
import com.clubflow.backend.user.UserService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserService userService;

    public AuthController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/me")
    public CurrentUserResponse me(@AuthenticationPrincipal OidcUser oidcUser) {
        return CurrentUserResponse.from(userService.getByGoogleSub(oidcUser.getSubject()));
    }

    @GetMapping("/csrf")
    public CsrfTokenResponse csrf(CsrfToken csrfToken) {
        return new CsrfTokenResponse(csrfToken.getHeaderName(), csrfToken.getToken());
    }
}
