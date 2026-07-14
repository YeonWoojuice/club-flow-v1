package com.clubflow.backend.application.email;

import com.clubflow.backend.application.Application;
import com.clubflow.backend.application.ApplicationRepository;
import com.clubflow.backend.application.ApplicationStatus;
import com.clubflow.backend.application.email.dto.ApplicationResultEmailBatchResponse;
import com.clubflow.backend.application.email.dto.ApplicationResultEmailRequest;
import com.clubflow.backend.club.ClubStaff;
import com.clubflow.backend.club.ClubAccessService;
import com.clubflow.backend.common.ConflictException;
import com.clubflow.backend.common.NotFoundException;
import com.clubflow.backend.generation.Generation;
import com.clubflow.backend.generation.GenerationService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
class ApplicationResultEmailPersistenceService {

    private final ApplicationRepository applicationRepository;
    private final ApplicationResultEmailBatchRepository batchRepository;
    private final ApplicationResultEmailMessageRepository messageRepository;
    private final ApplicationResultEmailQueryService queryService;
    private final ApplicationResultEmailTemplateRenderer renderer;
    private final ClubAccessService clubAccessService;
    private final GenerationService generationService;

    ApplicationResultEmailPersistenceService(
            ApplicationRepository applicationRepository,
            ApplicationResultEmailBatchRepository batchRepository,
            ApplicationResultEmailMessageRepository messageRepository,
            ApplicationResultEmailQueryService queryService,
            ApplicationResultEmailTemplateRenderer renderer,
            ClubAccessService clubAccessService,
            GenerationService generationService
    ) {
        this.applicationRepository = applicationRepository;
        this.batchRepository = batchRepository;
        this.messageRepository = messageRepository;
        this.queryService = queryService;
        this.renderer = renderer;
        this.clubAccessService = clubAccessService;
        this.generationService = generationService;
    }

    @Transactional
    public PreparedApplicationResultEmailBatch prepare(
            String googleSub,
            UUID clubId,
            ApplicationResultEmailRequest request
    ) {
        ClubStaff requester = clubAccessService.requireApplicationResultEmailManager(googleSub, clubId);
        validateDecision(request.decision());
        Generation generation = generationService.requireGenerationInClubForUpdate(request.generationId(), clubId);
        List<Application> applications = applicationRepository.findAllByGenerationIdAndStatusForUpdate(
                generation.getId(), request.decision()
        );
        Map<UUID, ApplicationResultEmailQueryService.ResultEmailState> states = queryService.latestStates(
                applications.stream().map(Application::getId).collect(Collectors.toSet())
        );
        List<Application> sendable = applications.stream()
                .filter(application -> isSendable(states.get(application.getId())))
                .filter(application -> canRender(application, request))
                .toList();
        if (sendable.isEmpty()) {
            throw new ConflictException("새로 발송하거나 필수 변수 값을 채워 재시도할 지원 결과 메일이 없습니다.");
        }

        ApplicationResultEmailBatch batch = batchRepository.save(ApplicationResultEmailBatch.create(
                generation.getClub(), generation, requester.getUser(), request.decision(),
                request.subjectTemplate().trim(), request.bodyTemplate().trim(), normalize(request.kakaoLink())
        ));
        List<ApplicationResultEmailMessage> messages = sendable.stream()
                .map(application -> createMessage(batch, application, request))
                .toList();
        messageRepository.saveAll(messages);
        messageRepository.flush();
        return new PreparedApplicationResultEmailBatch(batch, messages);
    }

    @Transactional
    public ApplicationResultEmailBatchResponse complete(
            UUID batchId,
            List<EmailSendResult> results
    ) {
        ApplicationResultEmailBatch batch = batchRepository.findById(batchId)
                .orElseThrow(() -> new NotFoundException("메일 발송 작업을 찾을 수 없습니다."));
        List<ApplicationResultEmailMessage> messages = messageRepository.findAllByBatchId(batchId);
        Map<UUID, EmailSendResult> byMessageId = results.stream()
                .collect(Collectors.toMap(EmailSendResult::messageId, Function.identity(), (left, right) -> left));
        for (ApplicationResultEmailMessage message : messages) {
            message.apply(byMessageId.getOrDefault(
                    message.getId(),
                    EmailSendResult.unknown(message.getId(), "메일 제공자의 결과를 확인하지 못했습니다.")
            ));
        }
        int sent = count(messages, ApplicationResultEmailMessageStatus.SENT);
        int failed = count(messages, ApplicationResultEmailMessageStatus.FAILED);
        int unknown = count(messages, ApplicationResultEmailMessageStatus.UNKNOWN);
        batch.complete(sent, failed, unknown);
        return ApplicationResultEmailBatchResponse.from(batch, messages);
    }

    private ApplicationResultEmailMessage createMessage(
            ApplicationResultEmailBatch batch,
            Application application,
            ApplicationResultEmailRequest request
    ) {
        RenderedEmail rendered = renderer.render(
                request.subjectTemplate(), request.bodyTemplate(), request.kakaoLink(), application
        );
        return ApplicationResultEmailMessage.create(
                batch, application, normalize(request.kakaoLink()), rendered.subject(), rendered.body()
        );
    }

    private boolean isSendable(ApplicationResultEmailQueryService.ResultEmailState state) {
        return state == null || state.status() == ApplicationResultEmailStatus.NOT_SENT
                || state.status() == ApplicationResultEmailStatus.FAILED;
    }

    private boolean canRender(Application application, ApplicationResultEmailRequest request) {
        try {
            renderer.render(
                    request.subjectTemplate(), request.bodyTemplate(), request.kakaoLink(), application
            );
            return true;
        } catch (MissingTemplateValueException exception) {
            return false;
        }
    }

    private int count(
            List<ApplicationResultEmailMessage> messages,
            ApplicationResultEmailMessageStatus status
    ) {
        return (int) messages.stream().filter(message -> message.getStatus() == status).count();
    }

    static void validateDecision(ApplicationStatus decision) {
        if (decision != ApplicationStatus.ACCEPTED && decision != ApplicationStatus.REJECTED) {
            throw new ConflictException("합격 또는 불합격 처리된 지원자만 메일을 발송할 수 있습니다.");
        }
    }

    private String normalize(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
