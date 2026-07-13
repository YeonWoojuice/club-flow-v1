package com.clubflow.backend.google;

import com.clubflow.backend.common.ConflictException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriUtils;

import java.net.URI;
import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withBadRequest;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

@ExtendWith(MockitoExtension.class)
class GoogleSheetsServiceTest {

    @Mock private GoogleDataOAuthService googleDataOAuthService;

    private MockRestServiceServer server;
    private GoogleSheetsService service;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).build();
        service = new GoogleSheetsService(googleDataOAuthService, builder.build());
        when(googleDataOAuthService.requireAccessToken("google-sub")).thenReturn("access-token");
    }

    @Test
    void 한글_공백_작은따옴표가_있는_탭을_한_번만_인코딩해서_읽는다() {
        String title = "26기 지원자's";
        expectMetadata(title);
        String encodedRange = UriUtils.encodePathSegment("'26기 지원자''s'", StandardCharsets.UTF_8);
        URI expectedValuesUri = URI.create(
                "https://sheets.googleapis.com/v4/spreadsheets/sheet-id/values/" + encodedRange
        );
        server.expect(once(), requestTo(expectedValuesUri))
                .andRespond(withSuccess(
                        "{\"values\":[[\"이름\"],[\"홍길동\"]]}", MediaType.APPLICATION_JSON
                ));

        var response = service.readTables("google-sub", "sheet-id");

        assertThat(response.tables()).singleElement().satisfies(table -> {
            assertThat(table.sheetId()).isEqualTo(123L);
            assertThat(table.name()).isEqualTo(title);
        });
        server.verify();
    }

    @Test
    void Google이_잘못된_범위라고_응답하면_재설정_안내를_표시한다() {
        expectMetadata("지원자");
        String encodedRange = UriUtils.encodePathSegment("'지원자'", StandardCharsets.UTF_8);
        server.expect(once(), requestTo(URI.create(
                        "https://sheets.googleapis.com/v4/spreadsheets/sheet-id/values/" + encodedRange
                )))
                .andRespond(withBadRequest());

        assertThatThrownBy(() -> service.readTables("google-sub", "sheet-id"))
                .isInstanceOf(ConflictException.class)
                .hasMessage("Google Sheet의 탭 이름 또는 범위를 읽지 못했습니다.");
        server.verify();
    }

    private void expectMetadata(String title) {
        server.expect(once(), requestTo("https://sheets.googleapis.com/v4/spreadsheets/sheet-id"))
                .andRespond(withSuccess(
                        "{\"sheets\":[{\"properties\":{\"sheetId\":123,\"title\":\"" + title + "\"}}]}",
                        MediaType.APPLICATION_JSON
                ));
    }
}
