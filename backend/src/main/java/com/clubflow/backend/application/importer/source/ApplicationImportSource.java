package com.clubflow.backend.application.importer.source;

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
@Table(name = "application_import_sources")
public class ApplicationImportSource {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "club_id", nullable = false)
    private Club club;

    @Column(name = "display_name", nullable = false, length = 100)
    private String displayName;

    @Column(name = "spreadsheet_id", nullable = false, length = 255)
    private String spreadsheetId;

    @Column(name = "sheet_id", nullable = false)
    private Long sheetId;

    @Column(name = "sheet_title", nullable = false, length = 255)
    private String sheetTitle;

    @Column(name = "name_header", nullable = false, length = 255)
    private String nameHeader;

    @Column(name = "email_header", nullable = false, length = 255)
    private String emailHeader;

    @Column(name = "student_number_header", nullable = false, length = 255)
    private String studentNumberHeader;

    @Column(name = "phone_header", length = 255)
    private String phoneHeader;

    @Column(name = "submitted_at_header", length = 255)
    private String submittedAtHeader;

    @Column(name = "discord_name_header", length = 255)
    private String discordNameHeader;

    @Column(name = "header_fingerprint", nullable = false, length = 64)
    private String headerFingerprint;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected ApplicationImportSource() {
    }

    private ApplicationImportSource(Club club, SourceValues values, Instant now) {
        this.club = club;
        apply(values);
        this.createdAt = now;
        this.updatedAt = now;
    }

    public static ApplicationImportSource create(Club club, SourceValues values) {
        return new ApplicationImportSource(club, values, Instant.now());
    }

    public void update(SourceValues values) {
        apply(values);
        this.updatedAt = Instant.now();
    }

    private void apply(SourceValues values) {
        this.displayName = values.displayName().trim();
        this.spreadsheetId = values.spreadsheetId().trim();
        this.sheetId = values.sheetId();
        this.sheetTitle = values.sheetTitle().trim();
        this.nameHeader = values.nameHeader().trim();
        this.emailHeader = values.emailHeader().trim();
        this.studentNumberHeader = values.studentNumberHeader().trim();
        this.phoneHeader = normalize(values.phoneHeader());
        this.submittedAtHeader = normalize(values.submittedAtHeader());
        this.discordNameHeader = normalize(values.discordNameHeader());
        this.headerFingerprint = values.headerFingerprint();
    }

    private static String normalize(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    public UUID getId() { return id; }
    public Club getClub() { return club; }
    public String getDisplayName() { return displayName; }
    public String getSpreadsheetId() { return spreadsheetId; }
    public Long getSheetId() { return sheetId; }
    public String getSheetTitle() { return sheetTitle; }
    public String getNameHeader() { return nameHeader; }
    public String getEmailHeader() { return emailHeader; }
    public String getStudentNumberHeader() { return studentNumberHeader; }
    public String getPhoneHeader() { return phoneHeader; }
    public String getSubmittedAtHeader() { return submittedAtHeader; }
    public String getDiscordNameHeader() { return discordNameHeader; }
    public String getHeaderFingerprint() { return headerFingerprint; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }

    public record SourceValues(
            String displayName,
            String spreadsheetId,
            Long sheetId,
            String sheetTitle,
            String nameHeader,
            String emailHeader,
            String studentNumberHeader,
            String phoneHeader,
            String submittedAtHeader,
            String discordNameHeader,
            String headerFingerprint
    ) {
        public SourceValues(
                String displayName,
                String spreadsheetId,
                Long sheetId,
                String sheetTitle,
                String nameHeader,
                String emailHeader,
                String studentNumberHeader,
                String phoneHeader,
                String submittedAtHeader,
                String headerFingerprint
        ) {
            this(displayName, spreadsheetId, sheetId, sheetTitle, nameHeader, emailHeader,
                    studentNumberHeader, phoneHeader, submittedAtHeader, null, headerFingerprint);
        }
    }
}
