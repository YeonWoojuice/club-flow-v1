package com.clubflow.backend.application.importer.source;

import com.clubflow.backend.club.Club;
import com.clubflow.backend.club.ClubAccessService;
import com.clubflow.backend.common.ConflictException;
import com.clubflow.backend.application.importer.source.dto.ApplicationImportSourceMappingRequest;
import com.clubflow.backend.application.importer.source.dto.UpsertApplicationImportSourceRequest;
import com.clubflow.backend.google.GoogleSheetsService;
import com.clubflow.backend.member.retention.dto.ParsedTableResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ApplicationImportSourceServiceTest {

    @Mock private ApplicationImportSourceRepository sourceRepository;
    @Mock private ClubAccessService clubAccessService;
    @Mock private GoogleSheetsService googleSheetsService;
    @Mock private ApplicationImportSource source;
    @Mock private Club club;

    private ApplicationImportSourceService service;
    private UUID clubId;
    private UUID sourceId;

    @BeforeEach
    void setUp() {
        service = new ApplicationImportSourceService(sourceRepository, clubAccessService, googleSheetsService);
        clubId = UUID.randomUUID();
        sourceId = UUID.randomUUID();
    }

    @Test
    void 저장된_탭_ID로_최신_표를_읽는다() {
        List<String> headers = List.of("이름", "이메일", "학번");
        ParsedTableResponse table = new ParsedTableResponse(
                123L, "이름이 바뀐 지원자 탭", headers,
                List.of(List.of("홍길동", "hong@example.com", "20260001"))
        );
        prepareSource(headers);
        prepareSourceResponse();
        when(googleSheetsService.readTable("google-sub", "spreadsheet-id", 123L)).thenReturn(table);

        var response = service.readLatest("google-sub", clubId, sourceId);

        assertThat(response.table()).isSameAs(table);
        assertThat(response.source().sheetTitle()).isEqualTo("저장 당시 지원자 탭");
        verify(googleSheetsService).readTable("google-sub", "spreadsheet-id", 123L);
    }

    @Test
    void 열_구성이_달라지면_자동으로_가져오지_않는다() {
        prepareSource(List.of("이름", "이메일", "학번"));
        when(googleSheetsService.readTable("google-sub", "spreadsheet-id", 123L))
                .thenReturn(new ParsedTableResponse(
                        123L, "지원자 탭", List.of("이름", "이메일", "전공"), List.of()
                ));

        assertThatThrownBy(() -> service.readLatest("google-sub", clubId, sourceId))
                .isInstanceOf(ConflictException.class)
                .hasMessage("Google Sheet의 열 구성이 변경되었습니다. 열 연결 규칙을 다시 설정해 주세요.");
    }

    @Test
    void 하나의_열을_여러_필드에_겹쳐_연결할_수_없다() {
        when(clubAccessService.requireAccessibleClub("google-sub", clubId)).thenReturn(club);
        UpsertApplicationImportSourceRequest request = new UpsertApplicationImportSourceRequest(
                "지원자 시트", "spreadsheet-id", 123L, "지원자 탭",
                List.of("이름", "이메일", "학번"),
                new ApplicationImportSourceMappingRequest("이름", "이메일", "이메일", null, null)
        );

        assertThatThrownBy(() -> service.create("google-sub", clubId, request))
                .isInstanceOf(ConflictException.class)
                .hasMessage("하나의 열을 여러 항목에 연결할 수 없습니다.");
    }

    private void prepareSource(List<String> storedHeaders) {
        when(sourceRepository.findByIdAndClubId(sourceId, clubId)).thenReturn(Optional.of(source));
        when(source.getSpreadsheetId()).thenReturn("spreadsheet-id");
        when(source.getSheetId()).thenReturn(123L);
        when(source.getHeaderFingerprint())
                .thenReturn(ApplicationImportSourceService.headerFingerprint(storedHeaders));
    }

    private void prepareSourceResponse() {
        when(source.getId()).thenReturn(sourceId);
        when(source.getClub()).thenReturn(club);
        when(club.getId()).thenReturn(clubId);
        when(source.getDisplayName()).thenReturn("지원자 시트");
        when(source.getSheetTitle()).thenReturn("저장 당시 지원자 탭");
        when(source.getNameHeader()).thenReturn("이름");
        when(source.getEmailHeader()).thenReturn("이메일");
        when(source.getStudentNumberHeader()).thenReturn("학번");
        when(source.getCreatedAt()).thenReturn(Instant.parse("2026-07-13T00:00:00Z"));
        when(source.getUpdatedAt()).thenReturn(Instant.parse("2026-07-13T00:00:00Z"));
    }
}
