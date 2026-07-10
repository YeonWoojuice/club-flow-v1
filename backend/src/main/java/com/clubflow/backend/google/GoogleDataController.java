package com.clubflow.backend.google;

import com.clubflow.backend.common.ConflictException;
import com.clubflow.backend.google.dto.GoogleAuthorizationUrlResponse;
import com.clubflow.backend.google.dto.GoogleConnectionStatusResponse;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;

@RestController
@RequestMapping("/api/google-data")
public class GoogleDataController {

    private static final String STATE_SESSION_KEY = "google-data-oauth-state";
    private static final String RETURN_PATH_SESSION_KEY = "google-data-return-path";

    private final GoogleDataOAuthService googleDataOAuthService;
    private final String frontendUrl;
    private final SecureRandom secureRandom = new SecureRandom();

    public GoogleDataController(
            GoogleDataOAuthService googleDataOAuthService,
            @Value("${app.frontend-url}") String frontendUrl
    ) {
        this.googleDataOAuthService = googleDataOAuthService;
        this.frontendUrl = frontendUrl;
    }

    @GetMapping("/status")
    public GoogleConnectionStatusResponse status(@AuthenticationPrincipal OidcUser oidcUser) {
        return googleDataOAuthService.status(oidcUser.getSubject());
    }

    @GetMapping("/oauth/authorization-url")
    public GoogleAuthorizationUrlResponse authorizationUrl(
            @AuthenticationPrincipal OidcUser oidcUser,
            @RequestParam(defaultValue = "/clubs") String returnPath,
            HttpSession session
    ) {
        if (oidcUser == null) throw new ConflictException("로그인이 필요합니다.");
        String state = newState();
        session.setAttribute(STATE_SESSION_KEY, state);
        session.setAttribute(RETURN_PATH_SESSION_KEY, safeReturnPath(returnPath));
        return new GoogleAuthorizationUrlResponse(googleDataOAuthService.authorizationUrl(state));
    }

    @GetMapping("/oauth/callback")
    public void callback(
            @AuthenticationPrincipal OidcUser oidcUser,
            @RequestParam(required = false) String code,
            @RequestParam(required = false) String state,
            @RequestParam(required = false) String error,
            HttpSession session,
            HttpServletResponse response
    ) throws IOException {
        String returnPath = safeReturnPath((String) session.getAttribute(RETURN_PATH_SESSION_KEY));
        String expectedState = (String) session.getAttribute(STATE_SESSION_KEY);
        session.removeAttribute(STATE_SESSION_KEY);
        session.removeAttribute(RETURN_PATH_SESSION_KEY);
        if (error != null || code == null || !stateMatches(expectedState, state)) {
            response.sendRedirect(frontendUrl + returnPath + "?google=error");
            return;
        }
        googleDataOAuthService.connect(oidcUser.getSubject(), code);
        response.sendRedirect(frontendUrl + returnPath + "?google=connected");
    }

    private String newState() {
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private boolean stateMatches(String expected, String actual) {
        if (expected == null || actual == null) return false;
        return MessageDigest.isEqual(expected.getBytes(), actual.getBytes());
    }

    private String safeReturnPath(String returnPath) {
        return returnPath != null && returnPath.startsWith("/clubs/") ? returnPath : "/clubs";
    }
}
