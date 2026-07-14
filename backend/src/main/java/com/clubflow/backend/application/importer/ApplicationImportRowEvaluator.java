package com.clubflow.backend.application.importer;

import com.clubflow.backend.application.importer.dto.ApplicationImportAnswerRequest;
import com.clubflow.backend.application.importer.dto.ApplicationImportPreviewRowResponse;
import com.clubflow.backend.application.importer.dto.ApplicationImportRowRequest;
import com.clubflow.backend.person.Person;

import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;

final class ApplicationImportRowEvaluator {

    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");

    List<EvaluatedRow> evaluate(
            List<ApplicationImportRowRequest> rows,
            Map<String, Person> peopleByEmail,
            Set<UUID> appliedPersonIds
    ) {
        Map<String, Long> emailCounts = rows.stream()
                .map(ApplicationImportRowRequest::email)
                .map(this::normalizeEmail)
                .filter(email -> email != null && EMAIL_PATTERN.matcher(email).matches())
                .collect(java.util.stream.Collectors.groupingBy(email -> email, java.util.stream.Collectors.counting()));

        return rows.stream()
                .map(row -> evaluateRow(row, emailCounts, peopleByEmail, appliedPersonIds))
                .toList();
    }

    private EvaluatedRow evaluateRow(
            ApplicationImportRowRequest row,
            Map<String, Long> emailCounts,
            Map<String, Person> peopleByEmail,
            Set<UUID> appliedPersonIds
    ) {
        String name = normalizeNullable(row.name());
        String email = normalizeEmail(row.email());
        String phone = normalizeNullable(row.phone());
        String studentNumber = normalizeNullable(row.studentNumber());
        String discordName = normalizeNullable(row.discordName());
        Person person = email == null ? null : peopleByEmail.get(email);

        if (email == null || email.length() > 255 || !EMAIL_PATTERN.matcher(email).matches()) {
            return result(row, name, email, phone, studentNumber, discordName, person,
                    ApplicationImportRowStatus.INVALID, "이메일을 확인해 주세요.");
        }
        if (emailCounts.getOrDefault(email, 0L) > 1) {
            return result(row, name, email, phone, studentNumber, discordName, person,
                    ApplicationImportRowStatus.DUPLICATE_IN_SOURCE,
                    "같은 원본에 동일한 이메일이 여러 번 있습니다.");
        }
        String validationMessage = validateFields(row, name, phone, studentNumber, discordName);
        if (validationMessage != null) {
            return result(row, name, email, phone, studentNumber, discordName, person,
                    ApplicationImportRowStatus.INVALID, validationMessage);
        }
        if (person != null && appliedPersonIds.contains(person.getId())) {
            return result(row, name, email, phone, studentNumber, discordName, person,
                    ApplicationImportRowStatus.ALREADY_APPLIED,
                    "같은 학기에 이미 등록된 지원자입니다.");
        }
        return result(row, name, email, phone, studentNumber, discordName, person,
                ApplicationImportRowStatus.READY, "가져올 수 있습니다.");
    }

    private String validateFields(
            ApplicationImportRowRequest row,
            String name,
            String phone,
            String studentNumber,
            String discordName
    ) {
        if (row.rowNumber() == null || row.rowNumber() < 2) return "원본 행 번호를 확인해 주세요.";
        if (name == null || name.length() > 100) return "이름을 확인해 주세요.";
        if (phone != null && phone.length() > 30) return "연락처는 30자 이하여야 합니다.";
        if (studentNumber == null || studentNumber.length() > 50) return "학번을 확인해 주세요.";
        if (discordName != null && discordName.length() > 100) return "디스코드 이름은 100자 이하여야 합니다.";
        if (row.answers() == null || row.answers().isEmpty()) return null;

        Set<String> questionKeys = new HashSet<>();
        for (ApplicationImportAnswerRequest answer : row.answers()) {
            if (answer == null) return "지원서 답변을 확인해 주세요.";
            String key = normalizeNullable(answer.questionKey());
            String label = normalizeNullable(answer.questionLabel());
            if (key == null || key.length() > 100) return "지원서 질문 키를 확인해 주세요.";
            if (!questionKeys.add(key)) return "지원서 질문 키는 중복될 수 없습니다.";
            if (label == null || label.length() > 500) return "지원서 질문 내용을 확인해 주세요.";
            if (answer.answerValue() == null) return "지원서 답변을 확인해 주세요.";
        }
        return null;
    }

    private EvaluatedRow result(
            ApplicationImportRowRequest source,
            String name,
            String email,
            String phone,
            String studentNumber,
            String discordName,
            Person person,
            ApplicationImportRowStatus status,
            String message
    ) {
        ApplicationImportPreviewRowResponse response = new ApplicationImportPreviewRowResponse(
                source.rowNumber(), name, email, phone, studentNumber, discordName, source.submittedAt(),
                person == null ? null : person.getId(), status, message
        );
        return new EvaluatedRow(source, name, email, phone, studentNumber, discordName, person, status, response);
    }

    private String normalizeEmail(String value) {
        return value == null || value.isBlank() ? null : value.trim().toLowerCase(Locale.ROOT);
    }

    private String normalizeNullable(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    record EvaluatedRow(
            ApplicationImportRowRequest source,
            String name,
            String email,
            String phone,
            String studentNumber,
            String discordName,
            Person person,
            ApplicationImportRowStatus status,
            ApplicationImportPreviewRowResponse response
    ) {
    }
}
