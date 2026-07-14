package com.clubflow.backend.application.email;

import com.fasterxml.jackson.annotation.JsonProperty;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.ArrayList;
import java.util.List;

@Component
public class ResendEmailSender implements EmailSender {

    private static final int MAX_BATCH_SIZE = 100;

    private final RestClient restClient;
    private final boolean enabled;
    private final String apiKey;
    private final String from;

    public ResendEmailSender(
            @Value("${app.mail.api-base:https://api.resend.com}") String apiBase,
            @Value("${app.mail.enabled:false}") boolean enabled,
            @Value("${app.mail.api-key:}") String apiKey,
            @Value("${app.mail.from:}") String from
    ) {
        this.restClient = RestClient.builder().baseUrl(apiBase).build();
        this.enabled = enabled;
        this.apiKey = apiKey;
        this.from = from;
    }

    @Override
    public boolean isEnabled() {
        return enabled && !apiKey.isBlank() && !from.isBlank();
    }

    @Override
    public List<EmailSendResult> sendBatch(
            String batchIdempotencyKey,
            List<EmailSendCommand> commands
    ) {
        if (!isEnabled()) {
            throw new IllegalStateException("메일 발송 설정이 비활성화되어 있습니다.");
        }
        List<EmailSendResult> results = new ArrayList<>();
        for (int start = 0, part = 1; start < commands.size(); start += MAX_BATCH_SIZE, part++) {
            int end = Math.min(start + MAX_BATCH_SIZE, commands.size());
            results.addAll(sendPart(
                    batchIdempotencyKey + "/" + part,
                    commands.subList(start, end)
            ));
        }
        return results;
    }

    private List<EmailSendResult> sendPart(
            String idempotencyKey,
            List<EmailSendCommand> commands
    ) {
        List<ResendEmailRequest> request = commands.stream()
                .map(command -> new ResendEmailRequest(
                        from, List.of(command.to()), command.subject(), command.body()
                ))
                .toList();
        try {
            ResendBatchResponse response = restClient.post()
                    .uri("/emails/batch")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
                    .header("Idempotency-Key", idempotencyKey)
                    .body(request)
                    .retrieve()
                    .body(ResendBatchResponse.class);
            List<ResendEmailResponse> data = response == null || response.data() == null
                    ? List.of()
                    : response.data();
            List<EmailSendResult> results = new ArrayList<>();
            for (int index = 0; index < commands.size(); index++) {
                EmailSendCommand command = commands.get(index);
                if (index < data.size() && data.get(index).id() != null) {
                    results.add(EmailSendResult.sent(command.messageId(), data.get(index).id()));
                } else {
                    results.add(EmailSendResult.unknown(
                            command.messageId(), "메일 제공자의 응답 항목을 확인하지 못했습니다."
                    ));
                }
            }
            return results;
        } catch (HttpClientErrorException exception) {
            return commands.stream()
                    .map(command -> EmailSendResult.failed(
                            command.messageId(), "메일 제공자가 발송 요청을 거절했습니다."
                    ))
                    .toList();
        } catch (RestClientException exception) {
            return commands.stream()
                    .map(command -> EmailSendResult.unknown(
                            command.messageId(), "메일 제공자의 응답을 확인하지 못했습니다."
                    ))
                    .toList();
        }
    }

    private record ResendEmailRequest(
            String from,
            List<String> to,
            String subject,
            String text
    ) {
    }

    private record ResendBatchResponse(List<ResendEmailResponse> data) {
    }

    private record ResendEmailResponse(@JsonProperty("id") String id) {
    }
}
