package com.clubflow.backend.member.retention;

import com.clubflow.backend.common.ConflictException;
import com.clubflow.backend.member.retention.dto.ParsedWorkbookResponse;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class TabularFileParserTest {

    private final TabularFileParser parser = new TabularFileParser();

    @Test
    void CSV의_한글과_인용된_쉼표를_행과_열로_읽는다() {
        String content = "이름,이메일,잔류 여부,메모\n김민수,member@example.com,잔류,\"운영진, 참여\"\n";
        MockMultipartFile file = new MockMultipartFile(
                "file", "retention.csv", "text/csv", content.getBytes(StandardCharsets.UTF_8)
        );

        ParsedWorkbookResponse result = parser.parse(file);

        assertThat(result.tables()).hasSize(1);
        assertThat(result.tables().getFirst().headers())
                .containsExactly("이름", "이메일", "잔류 여부", "메모");
        assertThat(result.tables().getFirst().rows().getFirst())
                .containsExactly("김민수", "member@example.com", "잔류", "운영진, 참여");
    }

    @Test
    void XLSX의_여러_Sheet와_숫자형_학번을_문자열로_읽는다() throws Exception {
        byte[] bytes;
        try (XSSFWorkbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            var first = workbook.createSheet("잔류 조사");
            var header = first.createRow(0);
            header.createCell(0).setCellValue("이름");
            header.createCell(1).setCellValue("학번");
            var row = first.createRow(1);
            row.createCell(0).setCellValue("김민수");
            row.createCell(1).setCellValue(20230001);

            var second = workbook.createSheet("추가 조사");
            second.createRow(0).createCell(0).setCellValue("이메일");
            second.createRow(1).createCell(0).setCellValue("member@example.com");
            workbook.write(output);
            bytes = output.toByteArray();
        }
        MockMultipartFile file = new MockMultipartFile(
                "file", "retention.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", bytes
        );

        ParsedWorkbookResponse result = parser.parse(file);

        assertThat(result.tables()).hasSize(2);
        assertThat(result.tables().getFirst().rows().getFirst())
                .containsExactly("김민수", "20230001");
    }

    @Test
    void 지원하지_않는_파일은_거절한다() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "retention.pdf", "application/pdf", new byte[]{1, 2, 3}
        );

        assertThatThrownBy(() -> parser.parse(file))
                .isInstanceOf(ConflictException.class)
                .hasMessage("CSV 또는 XLSX 파일만 업로드할 수 있습니다.");
    }
}
