package com.clubflow.backend.member.retention;

import com.clubflow.backend.common.ConflictException;
import com.clubflow.backend.member.retention.dto.ParsedTableResponse;
import com.clubflow.backend.member.retention.dto.ParsedWorkbookResponse;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Locale;

@Component
public class TabularFileParser {

    private static final int MAX_ROWS = 2_000;
    private static final int MAX_COLUMNS = 100;

    public ParsedWorkbookResponse parse(MultipartFile file) {
        if (file.isEmpty()) {
            throw new ConflictException("업로드한 파일이 비어 있습니다.");
        }
        String filename = file.getOriginalFilename() == null ? "" : file.getOriginalFilename();
        try {
            return switch (extension(filename)) {
                case "csv" -> new ParsedWorkbookResponse(List.of(parseCsv(file, filename)));
                case "xlsx" -> parseWorkbook(file);
                default -> throw new ConflictException("CSV 또는 XLSX 파일만 업로드할 수 있습니다.");
            };
        } catch (IOException exception) {
            throw new ConflictException("파일을 읽지 못했습니다. 파일 형식을 확인해 주세요.");
        }
    }

    private ParsedTableResponse parseCsv(MultipartFile file, String filename) throws IOException {
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8));
             CSVParser parser = CSVFormat.EXCEL.builder()
                     .setIgnoreEmptyLines(true)
                     .get()
                     .parse(reader)) {
            List<CSVRecord> records = parser.getRecords();
            if (records.isEmpty()) {
                throw new ConflictException("파일에 헤더가 없습니다.");
            }
            List<String> headers = stripBom(values(records.getFirst()));
            validateSize(headers.size(), records.size() - 1);
            List<List<String>> rows = records.stream().skip(1).map(this::values).toList();
            return new ParsedTableResponse(filename, headers, rows);
        }
    }

    private ParsedWorkbookResponse parseWorkbook(MultipartFile file) throws IOException {
        try (Workbook workbook = WorkbookFactory.create(file.getInputStream())) {
            DataFormatter formatter = new DataFormatter(Locale.KOREA);
            List<ParsedTableResponse> tables = new ArrayList<>();
            for (Sheet sheet : workbook) {
                if (sheet.getPhysicalNumberOfRows() == 0) continue;
                Row headerRow = sheet.getRow(sheet.getFirstRowNum());
                if (headerRow == null || headerRow.getLastCellNum() <= 0) continue;
                int columns = headerRow.getLastCellNum();
                int rowCount = sheet.getLastRowNum() - sheet.getFirstRowNum();
                validateSize(columns, rowCount);
                List<String> headers = rowValues(headerRow, columns, formatter);
                List<List<String>> rows = new ArrayList<>();
                for (int index = sheet.getFirstRowNum() + 1; index <= sheet.getLastRowNum(); index++) {
                    Row row = sheet.getRow(index);
                    rows.add(row == null ? emptyRow(columns) : rowValues(row, columns, formatter));
                }
                tables.add(new ParsedTableResponse(sheet.getSheetName(), headers, rows));
            }
            if (tables.isEmpty()) {
                throw new ConflictException("엑셀 파일에서 읽을 수 있는 Sheet를 찾지 못했습니다.");
            }
            return new ParsedWorkbookResponse(tables);
        }
    }

    private List<String> values(CSVRecord record) {
        List<String> values = new ArrayList<>();
        record.forEach(value -> values.add(value == null ? "" : value.trim()));
        return values;
    }

    private List<String> rowValues(Row row, int columns, DataFormatter formatter) {
        List<String> values = new ArrayList<>(columns);
        for (int index = 0; index < columns; index++) {
            values.add(formatter.formatCellValue(row.getCell(index)).trim());
        }
        return values;
    }

    private List<String> emptyRow(int columns) {
        return Collections.nCopies(columns, "");
    }

    private List<String> stripBom(List<String> headers) {
        if (headers.isEmpty()) return headers;
        List<String> result = new ArrayList<>(headers);
        result.set(0, result.getFirst().replaceFirst("^\\uFEFF", ""));
        return result;
    }

    private void validateSize(int columns, int rows) {
        if (columns <= 0) throw new ConflictException("파일에 헤더가 없습니다.");
        if (columns > MAX_COLUMNS) throw new ConflictException("열은 최대 100개까지 읽을 수 있습니다.");
        if (rows > MAX_ROWS) throw new ConflictException("한 번에 최대 2,000행까지 읽을 수 있습니다.");
    }

    private String extension(String filename) {
        int separator = filename.lastIndexOf('.');
        return separator < 0 ? "" : filename.substring(separator + 1).toLowerCase(Locale.ROOT);
    }
}
