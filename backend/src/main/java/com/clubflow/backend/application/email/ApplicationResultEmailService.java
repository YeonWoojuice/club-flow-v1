package com.clubflow.backend.application.email;

import com.clubflow.backend.application.Application;
import com.clubflow.backend.application.ApplicationRepository;
import com.clubflow.backend.application.email.dto.ApplicationResultEmailBatchResponse;
import com.clubflow.backend.application.email.dto.ApplicationResultEmailPreviewResponse;
import com.clubflow.backend.application.email.dto.ApplicationResultEmailPreviewRowResponse;
import com.clubflow.backend.application.email.dto.ApplicationResultEmailRequest;
import com.clubflow.backend.club.ClubAccessService;
import com.clubflow.backend.common.NotFoundException;
import com.clubflow.backend.common.ServiceUnavailableException;
import com.clubflow.backend.generation.GenerationService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class ApplicationResultEmailService {

    private final ApplicationRepository applicationRepository;
    private final ApplicationResultEmailBatchRepository batchRepository;
    private final ApplicationResultEmailMessageRepository messageRepository;
    private final ApplicationResultEmailQueryService queryService;
    private final ApplicationResultEmailPersistenceService persistenceService;
    private final ApplicationResultEmailTemplateRenderer renderer;
    private final ClubAccessService clubAccessService;
    private final GenerationService generationService;
    private final EmailSender emailSender;

    public ApplicationResultEmailService(
            ApplicationRepository applicationRepository,
            ApplicationResultEmailBatchRepository batchRepository,
            ApplicationResultEmailMessageRepository messageRepository,
            ApplicationResultEmailQueryService queryService,
            ApplicationResultEmailPersistenceService persistenceService,
            ApplicationResultEmailTemplateRenderer renderer,
            ClubAccessService clubAccessService,
            GenerationService generationService,
            EmailSender emailSender
    ) {
        this.applicationRepository = applicationRepository;
        this.batchRepository = batchRepository;
        this.messageRepository = messageRepository;
        this.queryService = queryService;
        this.persistenceService = persistenceService;
        this.renderer = renderer;
        this.clubAccessService = clubAccessService;
        this.generationService = generationService;
        this.emailSender = emailSender;
    }

    public ApplicationResultEmailPreviewResponse preview(
            String googleSub,
            UUID clubId,
            ApplicationResultEmailRequest request
    ) {
        clubAccessService.requireApplicationResultEmailManager(googleSub, clubId);
        ApplicationResultEmailPersistenceService.validateDecision(request.decision());
        renderer.validate(request.subjectTemplate(), request.bodyTemplate(), request.kakaoLink());
        generationService.requireGenerationInClub(request.generationId(), clubId);
        List<Application> applications = applicationRepository.findAllByGenerationIdAndStatus(
                request.generationId(), request.decision()
        );
        Map<UUID, ApplicationResultEmailQueryService.ResultEmailState> states = queryService.latestStates(
                applications.stream().map(Application::getId).collect(Collectors.toSet())
        );
        List<ApplicationResultEmailPreviewRowResponse> rows = applications.stream()
                .map(application -> previewRow(application, states.get(application.getId()), request))
                .toList();
        return ApplicationResultEmailPreviewResponse.from(rows);
    }

    public ApplicationResultEmailBatchResponse send(
            String googleSub,
            UUID clubId,
            ApplicationResultEmailRequest request
    ) {
        clubAccessService.requireApplicationResultEmailManager(googleSub, clubId);
        if (!emailSender.isEnabled()) {
            throw new ServiceUnavailableException("메일 발송 기능이 비활성화되어 있습니다.");
        }
        renderer.validate(request.subjectTemplate(), request.bodyTemplate(), request.kakaoLink());
        PreparedApplicationResultEmailBatch prepared = persistenceService.prepare(googleSub, clubId, request);
        List<EmailSendCommand> commands = prepared.messages().stream()
                .map(message -> new EmailSendCommand(
                        message.getId(), message.getIdempotencyKey(), message.getRecipientEmail(),
                        message.getSubject(), message.getBody()
                ))
                .toList();
        List<EmailSendResult> results;
        try {
            results = emailSender.sendBatch("application-result-batch/" + prepared.batch().getId(), commands);
        } catch (RuntimeException exception) {
            results = commands.stream()
                    .map(command -> EmailSendResult.unknown(
                            command.messageId(), "메일 제공자의 응답을 확인하지 못했습니다."
                    ))
                    .toList();
        }
        return persistenceService.complete(prepared.batch().getId(), results);
    }

    public ApplicationResultEmailBatchResponse getBatch(String googleSub, UUID clubId, UUID batchId) {
        clubAccessService.requireApplicationResultEmailManager(googleSub, clubId);
        ApplicationResultEmailBatch batch = batchRepository.findByIdAndClubId(batchId, clubId)
                .orElseThrow(() -> new NotFoundException("메일 발송 작업을 찾을 수 없습니다."));
        return ApplicationResultEmailBatchResponse.from(
                batch, messageRepository.findAllByBatchId(batchId)
        );
    }

    private ApplicationResultEmailPreviewRowResponse previewRow(
            Application application,
            ApplicationResultEmailQueryService.ResultEmailState state,
            ApplicationResultEmailRequest request
    ) {
        ApplicationResultEmailStatus status = state == null
                ? ApplicationResultEmailStatus.NOT_SENT
                : state.status();
        if (status == ApplicationResultEmailStatus.SENT) {
            return excluded(application, status, "이미 발송된 지원 결과 메일입니다.");
        }
        if (status == ApplicationResultEmailStatus.PENDING) {
            return excluded(application, status, "현재 발송 중인 지원 결과 메일입니다.");
        }
        if (status == ApplicationResultEmailStatus.UNKNOWN) {
            return excluded(application, status, "발송 여부를 확인할 수 없어 중복 발송을 막았습니다.");
        }
        try {
            RenderedEmail rendered = renderer.render(
                    request.subjectTemplate(), request.bodyTemplate(), request.kakaoLink(), application
            );
            return new ApplicationResultEmailPreviewRowResponse(
                    application.getId(), application.getPerson().getName(), application.getPerson().getEmail(),
                    application.getPerson().getDiscordName(), status, true,
                    status == ApplicationResultEmailStatus.FAILED ? "이전 실패 건을 재시도합니다." : null,
                    rendered.subject(), rendered.body()
            );
        } catch (MissingTemplateValueException exception) {
            return excluded(application, status, exception.getMessage());
        }
    }

    private ApplicationResultEmailPreviewRowResponse excluded(
            Application application,
            ApplicationResultEmailStatus status,
            String reason
    ) {
        return new ApplicationResultEmailPreviewRowResponse(
                application.getId(), application.getPerson().getName(), application.getPerson().getEmail(),
                application.getPerson().getDiscordName(), status, false, reason, null, null
        );
    }
}
