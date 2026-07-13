package com.clubflow.backend.google;

import com.clubflow.backend.common.ConflictException;
import com.clubflow.backend.common.NotFoundException;
import com.clubflow.backend.member.retention.dto.ParsedTableResponse;
import com.clubflow.backend.member.retention.dto.ParsedWorkbookResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.util.UriUtils;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

@Service
public class GoogleSheetsService {

    private static final Logger log = LoggerFactory.getLogger(GoogleSheetsService.class);
    private static final Pattern SPREADSHEET_ID = Pattern.compile("^[A-Za-z0-9_-]+$");
    private static final int MAX_ROWS = 2_000;
    private static final int MAX_COLUMNS = 100;

    private final GoogleDataOAuthService googleDataOAuthService;
    private final RestClient restClient;

    @Autowired
    public GoogleSheetsService(GoogleDataOAuthService googleDataOAuthService) {
        this(googleDataOAuthService, RestClient.create());
    }

    GoogleSheetsService(GoogleDataOAuthService googleDataOAuthService, RestClient restClient) {
        this.googleDataOAuthService = googleDataOAuthService;
        this.restClient = restClient;
    }

    public ParsedWorkbookResponse readTables(String googleSub, String spreadsheetId) {
        if (!SPREADSHEET_ID.matcher(spreadsheetId).matches()) {
            throw new ConflictException("Google Sheet 주소를 확인해 주세요.");
        }
        String accessToken = googleDataOAuthService.requireAccessToken(googleSub);
        try {
            SpreadsheetMetadata metadata = restClient.get()
                    .uri("https://sheets.googleapis.com/v4/spreadsheets/{spreadsheetId}", spreadsheetId)
                    .headers(headers -> headers.setBearerAuth(accessToken))
                    .retrieve()
                    .body(SpreadsheetMetadata.class);
            if (metadata == null || metadata.sheets() == null || metadata.sheets().isEmpty()) {
                throw new ConflictException("Google Sheet에서 탭을 찾지 못했습니다.");
            }
            List<ParsedTableResponse> tables = new ArrayList<>();
            for (SheetMetadata sheet : metadata.sheets()) {
                Long sheetId = sheet.properties().sheetId();
                String title = sheet.properties().title();
                ValuesResponse values = readValues(accessToken, spreadsheetId, title);
                tables.add(toTable(sheetId, title, values));
            }
            return new ParsedWorkbookResponse(tables);
        } catch (RestClientResponseException exception) {
            throw mapGoogleError(exception);
        }
    }

    public ParsedTableResponse readTable(String googleSub, String spreadsheetId, Long sheetId) {
        if (!SPREADSHEET_ID.matcher(spreadsheetId).matches()) {
            throw new ConflictException("Google Sheet 주소를 확인해 주세요.");
        }
        String accessToken = googleDataOAuthService.requireAccessToken(googleSub);
        try {
            SpreadsheetMetadata metadata = restClient.get()
                    .uri("https://sheets.googleapis.com/v4/spreadsheets/{spreadsheetId}", spreadsheetId)
                    .headers(headers -> headers.setBearerAuth(accessToken))
                    .retrieve()
                    .body(SpreadsheetMetadata.class);
            SheetProperties properties = metadata == null || metadata.sheets() == null
                    ? null
                    : metadata.sheets().stream()
                    .map(SheetMetadata::properties)
                    .filter(candidate -> candidate != null && sheetId.equals(candidate.sheetId()))
                    .findFirst()
                    .orElse(null);
            if (properties == null) {
                throw new ConflictException("저장된 시트 탭을 찾지 못했습니다. 가져오기 설정을 다시 확인해 주세요.");
            }
            ValuesResponse values = readValues(accessToken, spreadsheetId, properties.title());
            return toTable(properties.sheetId(), properties.title(), values);
        } catch (RestClientResponseException exception) {
            throw mapGoogleError(exception);
        }
    }

    private ValuesResponse readValues(String accessToken, String spreadsheetId, String title) {
        String range = UriUtils.encodePathSegment("'" + title.replace("'", "''") + "'", StandardCharsets.UTF_8);
        URI uri = URI.create("https://sheets.googleapis.com/v4/spreadsheets/" + spreadsheetId + "/values/" + range);
        return restClient.get()
                .uri(uri)
                .headers(headers -> headers.setBearerAuth(accessToken))
                .retrieve()
                .body(ValuesResponse.class);
    }

    private RuntimeException mapGoogleError(RestClientResponseException exception) {
        log.warn("Google Sheets API 요청 실패: status={}, body={}",
                exception.getStatusCode().value(), exception.getResponseBodyAsString());
        if (exception.getStatusCode().value() == 404) {
            return new NotFoundException("Google Sheet를 찾을 수 없습니다.");
        }
        if (exception.getStatusCode().value() == 401 || exception.getStatusCode().value() == 403) {
            return new ConflictException("Google Sheet 접근 권한을 확인하거나 다시 연결해 주세요.");
        }
        if (exception.getStatusCode().value() == 400) {
            return new ConflictException("Google Sheet의 탭 이름 또는 범위를 읽지 못했습니다.");
        }
        return new ConflictException("Google Sheet를 읽지 못했습니다. 잠시 후 다시 시도해 주세요.");
    }

    private ParsedTableResponse toTable(Long sheetId, String title, ValuesResponse response) {
        List<List<Object>> values = response == null || response.values() == null ? List.of() : response.values();
        if (values.isEmpty()) return new ParsedTableResponse(sheetId, title, List.of(), List.of());
        int columns = values.stream().mapToInt(List::size).max().orElse(0);
        int rows = values.size() - 1;
        if (columns > MAX_COLUMNS) throw new ConflictException("열은 최대 100개까지 읽을 수 있습니다.");
        if (rows > MAX_ROWS) throw new ConflictException("한 번에 최대 2,000행까지 읽을 수 있습니다.");
        List<String> headers = padded(values.getFirst(), columns);
        List<List<String>> dataRows = values.stream().skip(1).map(row -> padded(row, columns)).toList();
        return new ParsedTableResponse(sheetId, title, headers, dataRows);
    }

    private List<String> padded(List<Object> source, int columns) {
        List<String> values = new ArrayList<>(columns);
        for (int index = 0; index < columns; index++) {
            values.add(index < source.size() && source.get(index) != null
                    ? source.get(index).toString().trim()
                    : "");
        }
        return values;
    }

    private record SpreadsheetMetadata(List<SheetMetadata> sheets) {
    }

    private record SheetMetadata(SheetProperties properties) {
    }

    private record SheetProperties(Long sheetId, String title) {
    }

    private record ValuesResponse(List<List<Object>> values) {
    }
}
