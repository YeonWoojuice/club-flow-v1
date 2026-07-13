package com.clubflow.backend.application.importer.source;

import com.clubflow.backend.application.importer.source.ApplicationImportSource.SourceValues;
import com.clubflow.backend.application.importer.source.dto.ApplicationImportSourceMappingRequest;
import com.clubflow.backend.application.importer.source.dto.ApplicationImportSourceMappingResponse;
import com.clubflow.backend.application.importer.source.dto.ApplicationImportSourceResponse;
import com.clubflow.backend.application.importer.source.dto.ApplicationImportSourceTableResponse;
import com.clubflow.backend.application.importer.source.dto.UpsertApplicationImportSourceRequest;
import com.clubflow.backend.club.Club;
import com.clubflow.backend.club.ClubAccessService;
import com.clubflow.backend.common.ConflictException;
import com.clubflow.backend.common.NotFoundException;
import com.clubflow.backend.google.GoogleSheetsService;
import com.clubflow.backend.member.retention.dto.ParsedTableResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HashSet;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;
import java.util.stream.Stream;

@Service
@Transactional(readOnly = true)
public class ApplicationImportSourceService {

    private final ApplicationImportSourceRepository sourceRepository;
    private final ClubAccessService clubAccessService;
    private final GoogleSheetsService googleSheetsService;

    public ApplicationImportSourceService(
            ApplicationImportSourceRepository sourceRepository,
            ClubAccessService clubAccessService,
            GoogleSheetsService googleSheetsService
    ) {
        this.sourceRepository = sourceRepository;
        this.clubAccessService = clubAccessService;
        this.googleSheetsService = googleSheetsService;
    }

    public List<ApplicationImportSourceResponse> list(String googleSub, UUID clubId) {
        clubAccessService.requireAccessibleClub(googleSub, clubId);
        return sourceRepository.findAllByClubIdOrderByDisplayNameAsc(clubId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public ApplicationImportSourceResponse create(
            String googleSub,
            UUID clubId,
            UpsertApplicationImportSourceRequest request
    ) {
        Club club = clubAccessService.requireAccessibleClub(googleSub, clubId);
        SourceValues values = valuesFrom(request);
        return toResponse(sourceRepository.save(ApplicationImportSource.create(club, values)));
    }

    @Transactional
    public ApplicationImportSourceResponse update(
            String googleSub,
            UUID clubId,
            UUID sourceId,
            UpsertApplicationImportSourceRequest request
    ) {
        clubAccessService.requireAccessibleClub(googleSub, clubId);
        ApplicationImportSource source = requireSource(sourceId, clubId);
        source.update(valuesFrom(request));
        return toResponse(source);
    }

    @Transactional
    public void delete(String googleSub, UUID clubId, UUID sourceId) {
        clubAccessService.requireAccessibleClub(googleSub, clubId);
        sourceRepository.delete(requireSource(sourceId, clubId));
    }

    public ApplicationImportSourceTableResponse readLatest(
            String googleSub,
            UUID clubId,
            UUID sourceId
    ) {
        clubAccessService.requireAccessibleClub(googleSub, clubId);
        ApplicationImportSource source = requireSource(sourceId, clubId);
        ParsedTableResponse table = googleSheetsService.readTable(
                googleSub,
                source.getSpreadsheetId(),
                source.getSheetId()
        );
        if (!source.getHeaderFingerprint().equals(headerFingerprint(table.headers()))) {
            throw new ConflictException("Google Sheet의 열 구성이 변경되었습니다. 열 연결 규칙을 다시 설정해 주세요.");
        }
        return new ApplicationImportSourceTableResponse(toResponse(source), table);
    }

    private ApplicationImportSource requireSource(UUID sourceId, UUID clubId) {
        return sourceRepository.findByIdAndClubId(sourceId, clubId)
                .orElseThrow(() -> new NotFoundException("저장된 Google Sheet 설정을 찾을 수 없습니다."));
    }

    private SourceValues valuesFrom(UpsertApplicationImportSourceRequest request) {
        List<String> headers = request.headers().stream().map(String::trim).toList();
        List<String> namedHeaders = headers.stream().filter(header -> !header.isBlank()).toList();
        if (new HashSet<>(namedHeaders).size() != namedHeaders.size()) {
            throw new ConflictException("같은 이름의 열이 여러 개 있습니다. 열 제목을 다르게 바꿔 주세요.");
        }
        ApplicationImportSourceMappingRequest mapping = request.mapping();
        List<String> mappedHeaders = Stream.of(
                        mapping.nameHeader(), mapping.emailHeader(), mapping.studentNumberHeader(),
                        mapping.phoneHeader(), mapping.submittedAtHeader()
                )
                .filter(value -> value != null && !value.isBlank())
                .map(String::trim)
                .toList();
        if (new HashSet<>(mappedHeaders).size() != mappedHeaders.size()) {
            throw new ConflictException("하나의 열을 여러 항목에 연결할 수 없습니다.");
        }
        requireHeader(headers, mapping.nameHeader(), "이름");
        requireHeader(headers, mapping.emailHeader(), "이메일");
        requireHeader(headers, mapping.studentNumberHeader(), "학번");
        requireOptionalHeader(headers, mapping.phoneHeader(), "전화번호");
        requireOptionalHeader(headers, mapping.submittedAtHeader(), "제출일시");
        return new SourceValues(
                request.displayName(), request.spreadsheetId(), request.sheetId(), request.sheetTitle(),
                mapping.nameHeader(), mapping.emailHeader(), mapping.studentNumberHeader(),
                mapping.phoneHeader(), mapping.submittedAtHeader(), headerFingerprint(headers)
        );
    }

    private void requireHeader(List<String> headers, String header, String fieldName) {
        if (!headers.contains(header.trim())) {
            throw new ConflictException(fieldName + "에 연결한 열을 찾을 수 없습니다.");
        }
    }

    private void requireOptionalHeader(List<String> headers, String header, String fieldName) {
        if (header != null && !header.isBlank()) {
            requireHeader(headers, header, fieldName);
        }
    }

    static String headerFingerprint(List<String> headers) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            for (String header : headers) {
                byte[] bytes = header.trim().getBytes(StandardCharsets.UTF_8);
                digest.update(Integer.toString(bytes.length).getBytes(StandardCharsets.UTF_8));
                digest.update((byte) ':');
                digest.update(bytes);
                digest.update((byte) ';');
            }
            return HexFormat.of().formatHex(digest.digest());
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256을 사용할 수 없습니다.", exception);
        }
    }

    private ApplicationImportSourceResponse toResponse(ApplicationImportSource source) {
        return new ApplicationImportSourceResponse(
                source.getId(), source.getClub().getId(), source.getDisplayName(), source.getSpreadsheetId(),
                source.getSheetId(), source.getSheetTitle(),
                new ApplicationImportSourceMappingResponse(
                        source.getNameHeader(), source.getEmailHeader(), source.getStudentNumberHeader(),
                        source.getPhoneHeader(), source.getSubmittedAtHeader()
                ),
                source.getHeaderFingerprint(), source.getCreatedAt(), source.getUpdatedAt()
        );
    }
}
