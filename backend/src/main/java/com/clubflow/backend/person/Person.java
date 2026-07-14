package com.clubflow.backend.person;

import com.clubflow.backend.club.Club;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "persons")
public class Person {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "club_id", nullable = false)
    private Club club;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, length = 255)
    private String email;

    @Column(length = 30)
    private String phone;

    @Column(name = "student_number", nullable = false, length = 50)
    private String studentNumber;

    @Column(name = "discord_name", length = 100)
    private String discordName;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected Person() {
    }

    private Person(Club club, String name, String email, String phone, String studentNumber, String discordName) {
        Instant now = Instant.now();
        this.club = club;
        this.name = name.trim();
        this.email = email;
        this.phone = normalizeNullable(phone);
        this.studentNumber = studentNumber.trim();
        this.discordName = normalizeNullable(discordName);
        this.createdAt = now;
        this.updatedAt = now;
    }

    public static Person create(
            Club club,
            String name,
            String email,
            String phone,
            String studentNumber,
            String discordName
    ) {
        return new Person(club, name, email, phone, studentNumber, discordName);
    }

    public static Person create(Club club, String name, String email, String phone, String studentNumber) {
        return create(club, name, email, phone, studentNumber, null);
    }

    public void updateProfile(String name, String phone, String studentNumber, String discordName) {
        this.name = name.trim();
        this.phone = normalizeNullable(phone);
        this.studentNumber = studentNumber.trim();
        this.discordName = normalizeNullable(discordName);
        this.updatedAt = Instant.now();
    }

    private static String normalizeNullable(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    public UUID getId() {
        return id;
    }

    public Club getClub() {
        return club;
    }

    public String getName() {
        return name;
    }

    public String getEmail() {
        return email;
    }

    public String getPhone() {
        return phone;
    }

    public String getStudentNumber() {
        return studentNumber;
    }

    public String getDiscordName() {
        return discordName;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
