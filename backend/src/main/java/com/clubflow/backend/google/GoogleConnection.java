package com.clubflow.backend.google;

import com.clubflow.backend.user.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "google_connections")
public class GoogleConnection {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(name = "google_account_email", nullable = false, length = 255)
    private String googleAccountEmail;

    @Column(name = "access_token_encrypted", nullable = false)
    private String accessTokenEncrypted;

    @Column(name = "refresh_token_encrypted")
    private String refreshTokenEncrypted;

    @Column(nullable = false)
    private String scope;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected GoogleConnection() {
    }

    private GoogleConnection(
            User user,
            String googleAccountEmail,
            String accessTokenEncrypted,
            String refreshTokenEncrypted,
            String scope,
            Instant expiresAt
    ) {
        Instant now = Instant.now();
        this.user = user;
        this.googleAccountEmail = googleAccountEmail;
        this.accessTokenEncrypted = accessTokenEncrypted;
        this.refreshTokenEncrypted = refreshTokenEncrypted;
        this.scope = scope;
        this.expiresAt = expiresAt;
        this.createdAt = now;
        this.updatedAt = now;
    }

    public static GoogleConnection create(
            User user,
            String googleAccountEmail,
            String accessTokenEncrypted,
            String refreshTokenEncrypted,
            String scope,
            Instant expiresAt
    ) {
        return new GoogleConnection(
                user, googleAccountEmail, accessTokenEncrypted, refreshTokenEncrypted, scope, expiresAt
        );
    }

    public void updateTokens(
            String googleAccountEmail,
            String accessTokenEncrypted,
            String refreshTokenEncrypted,
            String scope,
            Instant expiresAt
    ) {
        this.googleAccountEmail = googleAccountEmail;
        this.accessTokenEncrypted = accessTokenEncrypted;
        if (refreshTokenEncrypted != null) {
            this.refreshTokenEncrypted = refreshTokenEncrypted;
        }
        this.scope = scope;
        this.expiresAt = expiresAt;
        this.updatedAt = Instant.now();
    }

    public String getGoogleAccountEmail() {
        return googleAccountEmail;
    }

    public String getAccessTokenEncrypted() {
        return accessTokenEncrypted;
    }

    public String getRefreshTokenEncrypted() {
        return refreshTokenEncrypted;
    }

    public String getScope() {
        return scope;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }
}
