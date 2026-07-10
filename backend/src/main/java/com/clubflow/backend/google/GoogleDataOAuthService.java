package com.clubflow.backend.google;

import com.clubflow.backend.common.ConflictException;
import com.clubflow.backend.google.dto.GoogleConnectionStatusResponse;
import com.clubflow.backend.user.User;
import com.clubflow.backend.user.UserService;
import com.fasterxml.jackson.annotation.JsonProperty;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;

@Service
@Transactional(readOnly = true)
public class GoogleDataOAuthService {

    private static final String SCOPE = String.join(" ",
            "openid",
            "email",
            "https://www.googleapis.com/auth/spreadsheets.readonly"
    );

    private final GoogleConnectionRepository connectionRepository;
    private final GoogleTokenCipher tokenCipher;
    private final UserService userService;
    private final RestClient restClient;
    private final String clientId;
    private final String clientSecret;
    private final String redirectUri;

    public GoogleDataOAuthService(
            GoogleConnectionRepository connectionRepository,
            GoogleTokenCipher tokenCipher,
            UserService userService,
            @Value("${app.google-data.client-id:}") String clientId,
            @Value("${app.google-data.client-secret:}") String clientSecret,
            @Value("${app.google-data.redirect-uri:}") String redirectUri
    ) {
        this.connectionRepository = connectionRepository;
        this.tokenCipher = tokenCipher;
        this.userService = userService;
        this.restClient = RestClient.create();
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.redirectUri = redirectUri;
    }

    public String authorizationUrl(String state) {
        requireConfiguration();
        return UriComponentsBuilder.fromUriString("https://accounts.google.com/o/oauth2/v2/auth")
                .queryParam("client_id", clientId)
                .queryParam("redirect_uri", redirectUri)
                .queryParam("response_type", "code")
                .queryParam("scope", SCOPE)
                .queryParam("access_type", "offline")
                .queryParam("prompt", "consent")
                .queryParam("include_granted_scopes", "true")
                .queryParam("state", state)
                .build()
                .encode()
                .toUriString();
    }

    public GoogleConnectionStatusResponse status(String googleSub) {
        User user = userService.getByGoogleSub(googleSub);
        return connectionRepository.findByUserId(user.getId())
                .map(connection -> new GoogleConnectionStatusResponse(
                        true, connection.getGoogleAccountEmail()
                ))
                .orElseGet(() -> new GoogleConnectionStatusResponse(false, null));
    }

    @Transactional
    public void connect(String googleSub, String code) {
        requireConfiguration();
        TokenResponse token = exchangeCode(code);
        if (token == null || token.accessToken() == null || token.expiresIn() == null) {
            throw new ConflictException("Google 데이터 권한을 연결하지 못했습니다.");
        }
        GoogleUserInfo userInfo = restClient.get()
                .uri("https://openidconnect.googleapis.com/v1/userinfo")
                .headers(headers -> headers.setBearerAuth(token.accessToken()))
                .retrieve()
                .body(GoogleUserInfo.class);
        if (userInfo == null || userInfo.email() == null) {
            throw new ConflictException("연결한 Google 계정 정보를 확인하지 못했습니다.");
        }

        User user = userService.getByGoogleSub(googleSub);
        String encryptedAccess = tokenCipher.encrypt(token.accessToken());
        String encryptedRefresh = token.refreshToken() == null ? null : tokenCipher.encrypt(token.refreshToken());
        String scope = Optional.ofNullable(token.scope()).orElse(SCOPE);
        Instant expiresAt = Instant.now().plus(token.expiresIn(), ChronoUnit.SECONDS);
        GoogleConnection connection = connectionRepository.findByUserId(user.getId())
                .orElseGet(() -> GoogleConnection.create(
                        user, userInfo.email(), encryptedAccess, encryptedRefresh, scope, expiresAt
                ));
        if (connectionRepository.findByUserId(user.getId()).isPresent()) {
            connection.updateTokens(userInfo.email(), encryptedAccess, encryptedRefresh, scope, expiresAt);
        }
        connectionRepository.save(connection);
    }

    @Transactional
    public String requireAccessToken(String googleSub) {
        requireConfiguration();
        User user = userService.getByGoogleSub(googleSub);
        GoogleConnection connection = connectionRepository.findByUserId(user.getId())
                .orElseThrow(() -> new ConflictException("Google Sheet를 먼저 연결해 주세요."));
        if (connection.getExpiresAt().isAfter(Instant.now().plusSeconds(60))) {
            return tokenCipher.decrypt(connection.getAccessTokenEncrypted());
        }
        if (connection.getRefreshTokenEncrypted() == null) {
            throw new ConflictException("Google Sheet 연결을 다시 진행해 주세요.");
        }
        TokenResponse refreshed = refresh(tokenCipher.decrypt(connection.getRefreshTokenEncrypted()));
        if (refreshed == null || refreshed.accessToken() == null || refreshed.expiresIn() == null) {
            throw new ConflictException("Google Sheet 연결을 다시 진행해 주세요.");
        }
        String accessToken = refreshed.accessToken();
        connection.updateTokens(
                connection.getGoogleAccountEmail(),
                tokenCipher.encrypt(accessToken),
                null,
                Optional.ofNullable(refreshed.scope()).orElse(connection.getScope()),
                Instant.now().plus(refreshed.expiresIn(), ChronoUnit.SECONDS)
        );
        return accessToken;
    }

    private TokenResponse exchangeCode(String code) {
        MultiValueMap<String, String> form = baseForm();
        form.add("code", code);
        form.add("redirect_uri", redirectUri);
        form.add("grant_type", "authorization_code");
        return tokenRequest(form);
    }

    private TokenResponse refresh(String refreshToken) {
        MultiValueMap<String, String> form = baseForm();
        form.add("refresh_token", refreshToken);
        form.add("grant_type", "refresh_token");
        return tokenRequest(form);
    }

    private MultiValueMap<String, String> baseForm() {
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("client_id", clientId);
        form.add("client_secret", clientSecret);
        return form;
    }

    private TokenResponse tokenRequest(MultiValueMap<String, String> form) {
        try {
            return restClient.post()
                    .uri("https://oauth2.googleapis.com/token")
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(form)
                    .retrieve()
                    .body(TokenResponse.class);
        } catch (RuntimeException exception) {
            throw new ConflictException("Google 데이터 권한을 연결하지 못했습니다.");
        }
    }

    private void requireConfiguration() {
        if (clientId.isBlank() || clientSecret.isBlank() || redirectUri.isBlank()) {
            throw new ConflictException("Google 데이터 연결 설정이 필요합니다.");
        }
    }

    private record TokenResponse(
            @JsonProperty("access_token") String accessToken,
            @JsonProperty("refresh_token") String refreshToken,
            @JsonProperty("expires_in") Long expiresIn,
            String scope,
            @JsonProperty("token_type") String tokenType
    ) {
    }

    private record GoogleUserInfo(String email) {
    }
}
