package com.clubflow.backend.application.email;

import com.clubflow.backend.application.Application;
import com.clubflow.backend.common.InvalidRequestException;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class ApplicationResultEmailTemplateRenderer {

    private static final Pattern VARIABLE = Pattern.compile("\\{\\{\\s*([A-Za-z][A-Za-z0-9]*)\\s*}}" );
    private static final Set<String> SUPPORTED = Set.of(
            "clubName", "memberName", "discordName", "kakaoLink"
    );

    public void validate(String subjectTemplate, String bodyTemplate, String kakaoLink) {
        validateTemplate(subjectTemplate);
        validateTemplate(bodyTemplate);
        validateKakaoLink(kakaoLink);
    }

    public RenderedEmail render(
            String subjectTemplate,
            String bodyTemplate,
            String kakaoLink,
            Application application
    ) {
        Map<String, String> values = Map.of(
                "clubName", application.getGeneration().getClub().getName(),
                "memberName", application.getPerson().getName(),
                "discordName", valueOrEmpty(application.getPerson().getDiscordName()),
                "kakaoLink", valueOrEmpty(kakaoLink)
        );
        String subject = renderTemplate(subjectTemplate, values);
        String body = renderTemplate(bodyTemplate, values);
        if (subject.length() > 200) {
            throw new MissingTemplateValueException("치환된 메일 제목은 200자 이하여야 합니다.");
        }
        return new RenderedEmail(subject, body);
    }

    private void validateTemplate(String template) {
        Matcher matcher = VARIABLE.matcher(template);
        while (matcher.find()) {
            if (!SUPPORTED.contains(matcher.group(1))) {
                throw new InvalidRequestException("지원하지 않는 메일 템플릿 변수입니다: " + matcher.group(1));
            }
        }
        String withoutVariables = VARIABLE.matcher(template).replaceAll("");
        if (withoutVariables.contains("{{") || withoutVariables.contains("}}")) {
            throw new InvalidRequestException("메일 템플릿 변수 형식을 확인해 주세요.");
        }
    }

    private String renderTemplate(String template, Map<String, String> values) {
        Matcher matcher = VARIABLE.matcher(template);
        StringBuffer rendered = new StringBuffer();
        while (matcher.find()) {
            String variable = matcher.group(1);
            String value = values.get(variable);
            if (value == null || value.isBlank()) {
                throw new MissingTemplateValueException(
                        "메일 템플릿에 필요한 " + variable + " 값이 없습니다."
                );
            }
            matcher.appendReplacement(rendered, Matcher.quoteReplacement(value));
        }
        matcher.appendTail(rendered);
        return rendered.toString();
    }

    private void validateKakaoLink(String value) {
        if (value == null || value.isBlank()) return;
        try {
            URI uri = new URI(value.trim());
            if (!"https".equalsIgnoreCase(uri.getScheme()) || uri.getHost() == null) {
                throw new InvalidRequestException("카카오톡 링크는 https 주소여야 합니다.");
            }
        } catch (URISyntaxException exception) {
            throw new InvalidRequestException("카카오톡 링크 주소를 확인해 주세요.");
        }
    }

    private String valueOrEmpty(String value) {
        return value == null ? "" : value.trim();
    }
}
