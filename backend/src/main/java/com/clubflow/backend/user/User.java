package com.clubflow.backend.user;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "google_sub", nullable = false, unique = true, length = 255)
    private String googleSub;

    @Column(nullable = false, unique = true, length = 255)
    private String email;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "profile_image_url", columnDefinition = "TEXT")
    private String profileImageUrl;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "last_login_at", nullable = false)
    private Instant lastLoginAt;

    protected User() {
    }

    private User(String googleSub, String email, String name, String profileImageUrl, Instant now) {
        this.googleSub = googleSub;
        this.email = email;
        this.name = name;
        this.profileImageUrl = profileImageUrl;
        this.createdAt = now;
        this.lastLoginAt = now;
    }

    public static User create(String googleSub, String email, String name, String profileImageUrl) {
        return new User(googleSub, email, name, profileImageUrl, Instant.now());
    }

    public void updateGoogleProfile(String email, String name, String profileImageUrl) {
        this.email = email;
        this.name = name;
        this.profileImageUrl = profileImageUrl;
        this.lastLoginAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public String getGoogleSub() {
        return googleSub;
    }

    public String getEmail() {
        return email;
    }

    public String getName() {
        return name;
    }

    public String getProfileImageUrl() {
        return profileImageUrl;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getLastLoginAt() {
        return lastLoginAt;
    }
}
