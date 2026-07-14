package com.clubflow.backend.application;

import com.clubflow.backend.application.dto.ApplicationAnswerRequest;
import com.clubflow.backend.application.dto.ApplicationDetailResponse;
import com.clubflow.backend.application.dto.ApplicationSummaryResponse;
import com.clubflow.backend.application.dto.ManualApplicationRequest;
import com.clubflow.backend.application.email.ApplicationResultEmailQueryService;
import com.clubflow.backend.club.Club;
import com.clubflow.backend.club.ClubAccessService;
import com.clubflow.backend.common.ConflictException;
import com.clubflow.backend.common.NotFoundException;
import com.clubflow.backend.generation.Generation;
import com.clubflow.backend.generation.GenerationService;
import com.clubflow.backend.generation.GenerationStatus;
import com.clubflow.backend.member.GenerationMemberService;
import com.clubflow.backend.person.Person;
import com.clubflow.backend.person.PersonService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.Map;

@Service
@Transactional(readOnly = true)
public class ApplicationService {

    private final ApplicationRepository applicationRepository;
    private final ApplicationAnswerRepository applicationAnswerRepository;
    private final ClubAccessService clubAccessService;
    private final GenerationService generationService;
    private final PersonService personService;
    private final GenerationMemberService generationMemberService;
    private final ApplicationResultEmailQueryService resultEmailQueryService;

    public ApplicationService(
            ApplicationRepository applicationRepository,
            ApplicationAnswerRepository applicationAnswerRepository,
            ClubAccessService clubAccessService,
            GenerationService generationService,
            PersonService personService,
            GenerationMemberService generationMemberService,
            ApplicationResultEmailQueryService resultEmailQueryService
    ) {
        this.applicationRepository = applicationRepository;
        this.applicationAnswerRepository = applicationAnswerRepository;
        this.clubAccessService = clubAccessService;
        this.generationService = generationService;
        this.personService = personService;
        this.generationMemberService = generationMemberService;
        this.resultEmailQueryService = resultEmailQueryService;
    }

    public List<ApplicationSummaryResponse> list(String googleSub, UUID clubId) {
        clubAccessService.requireAccessibleClub(googleSub, clubId);
        List<Application> applications = applicationRepository.findAllByClubId(clubId);
        Map<UUID, ApplicationResultEmailQueryService.ResultEmailState> states = resultEmailQueryService.latestStates(
                applications.stream().map(Application::getId).collect(java.util.stream.Collectors.toSet())
        );
        return applications.stream()
                .map(application -> ApplicationSummaryResponse.from(
                        application,
                        states.getOrDefault(application.getId(), ApplicationResultEmailQueryService.ResultEmailState.notSent())
                ))
                .toList();
    }

    @Transactional
    public ApplicationDetailResponse createManual(
            String googleSub,
            UUID clubId,
            ManualApplicationRequest request
    ) {
        Club club = clubAccessService.requireAccessibleClub(googleSub, clubId);
        Generation generation = generationService.requireGenerationInClub(request.generationId(), clubId);
        if (generation.getStatus() != GenerationStatus.ACTIVE) {
            throw new ConflictException("종료된 학기에는 지원자를 등록할 수 없습니다.");
        }
        validateUniqueQuestionKeys(request.applicationAnswers());
        Person person = personService.findOrCreate(
                club,
                request.name(),
                request.email(),
                request.phone(),
                request.studentNumber(),
                request.discordName()
        );
        if (applicationRepository.existsByGenerationIdAndPersonId(generation.getId(), person.getId())) {
            throw new ConflictException("같은 학기에 이미 등록된 지원자가 있습니다.");
        }

        Application application = applicationRepository.save(Application.createManual(generation, person));
        List<ApplicationAnswer> answers = createAnswers(application, request.applicationAnswers());
        applicationAnswerRepository.saveAll(answers);
        ApplicationResultEmailQueryService.ResultEmailState state = resultEmailQueryService.latestStates(
                Set.of(application.getId())
        ).getOrDefault(application.getId(), ApplicationResultEmailQueryService.ResultEmailState.notSent());
        return ApplicationDetailResponse.from(application, answers, state);
    }

    public ApplicationDetailResponse get(String googleSub, UUID applicationId) {
        Application application = getApplication(applicationId);
        clubAccessService.requireAccessibleClub(
                googleSub,
                application.getGeneration().getClub().getId()
        );
        return detail(application);
    }

    @Transactional
    public ApplicationDetailResponse changeStatus(
            String googleSub,
            UUID applicationId,
            ApplicationStatus targetStatus
    ) {
        Application application = applicationRepository.findByIdForUpdate(applicationId)
                .orElseThrow(() -> new NotFoundException("지원서를 찾을 수 없습니다."));
        clubAccessService.requireAccessibleClub(
                googleSub,
                application.getGeneration().getClub().getId()
        );
        application.changeStatus(targetStatus);
        if (targetStatus == ApplicationStatus.ACCEPTED) {
            generationMemberService.ensureAcceptedMember(
                    application.getGeneration(),
                    application.getPerson()
            );
        }
        return detail(application);
    }

    private Application getApplication(UUID applicationId) {
        return applicationRepository.findById(applicationId)
                .orElseThrow(() -> new NotFoundException("지원서를 찾을 수 없습니다."));
    }

    private ApplicationDetailResponse detail(Application application) {
        List<ApplicationAnswer> answers =
                applicationAnswerRepository.findAllByApplicationIdOrderByDisplayOrderAsc(application.getId());
        ApplicationResultEmailQueryService.ResultEmailState state = resultEmailQueryService.latestStates(
                Set.of(application.getId())
        ).getOrDefault(application.getId(), ApplicationResultEmailQueryService.ResultEmailState.notSent());
        return ApplicationDetailResponse.from(application, answers, state);
    }

    private List<ApplicationAnswer> createAnswers(
            Application application,
            List<ApplicationAnswerRequest> answerRequests
    ) {
        return java.util.stream.IntStream.range(0, answerRequests.size())
                .mapToObj(index -> {
                    ApplicationAnswerRequest answer = answerRequests.get(index);
                    return ApplicationAnswer.createText(
                            application,
                            answer.questionKey(),
                            answer.questionLabel(),
                            answer.answerValue(),
                            index
                    );
                })
                .toList();
    }

    private void validateUniqueQuestionKeys(List<ApplicationAnswerRequest> answers) {
        Set<String> keys = new HashSet<>();
        boolean duplicated = answers.stream()
                .map(answer -> answer.questionKey().trim())
                .anyMatch(key -> !keys.add(key));
        if (duplicated) {
            throw new ConflictException("지원서 질문 키는 중복될 수 없습니다.");
        }
    }
}
