package com.clubflow.backend.auth;

import com.clubflow.backend.user.UserService;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserRequest;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserService;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.stereotype.Service;

@Service
public class GoogleOidcUserService extends OidcUserService {

    private final UserService userService;

    public GoogleOidcUserService(UserService userService) {
        this.userService = userService;
    }

    @Override
    public OidcUser loadUser(OidcUserRequest userRequest) throws OAuth2AuthenticationException {
        OidcUser oidcUser = super.loadUser(userRequest);
        if (!Boolean.TRUE.equals(oidcUser.getEmailVerified())) {
            throw new OAuth2AuthenticationException(
                    new OAuth2Error("email_not_verified"),
                    "Google 이메일 인증이 필요합니다."
            );
        }

        String displayName = oidcUser.getFullName();
        if (displayName == null || displayName.isBlank()) {
            displayName = oidcUser.getEmail();
        }
        userService.synchronizeGoogleUser(
                oidcUser.getSubject(),
                oidcUser.getEmail(),
                displayName,
                oidcUser.getPicture()
        );
        return oidcUser;
    }
}
