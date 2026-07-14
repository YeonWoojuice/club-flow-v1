package com.clubflow.backend.application.importer;

import com.clubflow.backend.application.Application;
import com.clubflow.backend.application.ApplicationAnswer;
import com.clubflow.backend.application.ApplicationAnswerRepository;
import com.clubflow.backend.application.ApplicationRepository;
import com.clubflow.backend.application.importer.dto.ApplicationImportAnswerRequest;
import com.clubflow.backend.application.importer.dto.ApplicationImportApplyResponse;
import com.clubflow.backend.application.importer.dto.ApplicationImportPreviewResponse;
import com.clubflow.backend.application.importer.dto.ApplicationImportRequest;
import com.clubflow.backend.club.Club;
import com.clubflow.backend.club.ClubAccessService;
import com.clubflow.backend.common.ConflictException;
import com.clubflow.backend.generation.Generation;
import com.clubflow.backend.generation.GenerationService;
import com.clubflow.backend.generation.GenerationStatus;
import com.clubflow.backend.person.Person;
import com.clubflow.backend.person.PersonRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class ApplicationImportService {

    private final ApplicationRepository applicationRepository;
    private final ApplicationAnswerRepository applicationAnswerRepository;
    private final PersonRepository personRepository;
    private final ClubAccessService clubAccessService;
    private final GenerationService generationService;
    private final ApplicationImportRowEvaluator rowEvaluator = new ApplicationImportRowEvaluator();

    public ApplicationImportService(
            ApplicationRepository applicationRepository,
            ApplicationAnswerRepository applicationAnswerRepository,
            PersonRepository personRepository,
            ClubAccessService clubAccessService,
            GenerationService generationService
    ) {
        this.applicationRepository = applicationRepository;
        this.applicationAnswerRepository = applicationAnswerRepository;
        this.personRepository = personRepository;
        this.clubAccessService = clubAccessService;
        this.generationService = generationService;
    }

    public void requireClubAccess(String googleSub, UUID clubId) {
        clubAccessService.requireAccessibleClub(googleSub, clubId);
    }

    public ApplicationImportPreviewResponse preview(
            String googleSub,
            UUID clubId,
            ApplicationImportRequest request
    ) {
        Club club = clubAccessService.requireAccessibleClub(googleSub, clubId);
        Generation generation = requireActiveGeneration(request.generationId(), clubId, false);
        List<ApplicationImportRowEvaluator.EvaluatedRow> rows = evaluate(club, generation, request);
        return ApplicationImportPreviewResponse.from(rows.stream().map(
                ApplicationImportRowEvaluator.EvaluatedRow::response
        ).toList());
    }

    @Transactional
    public ApplicationImportApplyResponse apply(
            String googleSub,
            UUID clubId,
            ApplicationImportRequest request
    ) {
        Club club = clubAccessService.requireAccessibleClub(googleSub, clubId);
        Generation generation = requireActiveGeneration(request.generationId(), clubId, true);
        List<ApplicationImportRowEvaluator.EvaluatedRow> evaluatedRows = evaluate(club, generation, request);
        int createdCount = 0;

        for (ApplicationImportRowEvaluator.EvaluatedRow row : evaluatedRows) {
            if (row.status() != ApplicationImportRowStatus.READY) continue;
            Person person = row.person() == null
                    ? personRepository.save(Person.create(
                            club, row.name(), row.email(), row.phone(), row.studentNumber(), row.discordName()
                    ))
                    : row.person();
            Application application = applicationRepository.save(Application.createFromGoogleForm(
                    generation,
                    person,
                    row.source().submittedAt() == null
                            ? java.time.Instant.now()
                            : row.source().submittedAt()
            ));
            if (row.source().answers() != null && !row.source().answers().isEmpty()) {
                applicationAnswerRepository.saveAll(createAnswers(application, row.source().answers()));
            }
            createdCount++;
        }
        return new ApplicationImportApplyResponse(
                request.rows().size(), createdCount, request.rows().size() - createdCount
        );
    }

    private Generation requireActiveGeneration(UUID generationId, UUID clubId, boolean lock) {
        Generation generation = lock
                ? generationService.requireGenerationInClubForUpdate(generationId, clubId)
                : generationService.requireGenerationInClub(generationId, clubId);
        if (generation.getStatus() != GenerationStatus.ACTIVE) {
            throw new ConflictException("종료된 학기에는 지원자를 가져올 수 없습니다.");
        }
        return generation;
    }

    private List<ApplicationImportRowEvaluator.EvaluatedRow> evaluate(
            Club club,
            Generation generation,
            ApplicationImportRequest request
    ) {
        Set<String> emails = request.rows().stream()
                .map(row -> row.email() == null ? null : row.email().trim().toLowerCase(java.util.Locale.ROOT))
                .filter(email -> email != null && !email.isBlank())
                .collect(java.util.stream.Collectors.toSet());
        Map<String, Person> peopleByEmail = new HashMap<>();
        if (!emails.isEmpty()) {
            personRepository.findAllByClubIdAndEmailIn(club.getId(), emails)
                    .forEach(person -> peopleByEmail.put(person.getEmail(), person));
        }
        Set<UUID> appliedPersonIds = new HashSet<>();
        Set<UUID> personIds = peopleByEmail.values().stream()
                .map(Person::getId)
                .collect(java.util.stream.Collectors.toSet());
        if (!personIds.isEmpty()) {
            applicationRepository.findAllByGenerationIdAndPersonIdIn(generation.getId(), personIds)
                    .forEach(application -> appliedPersonIds.add(application.getPerson().getId()));
        }
        return rowEvaluator.evaluate(request.rows(), peopleByEmail, appliedPersonIds);
    }

    private List<ApplicationAnswer> createAnswers(
            Application application,
            List<ApplicationImportAnswerRequest> requests
    ) {
        return java.util.stream.IntStream.range(0, requests.size())
                .mapToObj(index -> {
                    ApplicationImportAnswerRequest answer = requests.get(index);
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
}
