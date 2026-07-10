package com.clubflow.backend.member.retention;

import com.clubflow.backend.club.ClubAccessService;
import com.clubflow.backend.common.ConflictException;
import com.clubflow.backend.common.NotFoundException;
import com.clubflow.backend.generation.Generation;
import com.clubflow.backend.generation.GenerationService;
import com.clubflow.backend.generation.GenerationStatus;
import com.clubflow.backend.member.GenerationMember;
import com.clubflow.backend.member.GenerationMemberRepository;
import com.clubflow.backend.member.retention.dto.RetentionApplyRequest;
import com.clubflow.backend.member.retention.dto.RetentionApplyResponse;
import com.clubflow.backend.member.retention.dto.RetentionImportRowRequest;
import com.clubflow.backend.member.retention.dto.RetentionPreviewRequest;
import com.clubflow.backend.member.retention.dto.RetentionPreviewResponse;
import com.clubflow.backend.member.retention.dto.RetentionPreviewRowResponse;
import com.clubflow.backend.person.Person;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;

@Service
@Transactional(readOnly = true)
public class RetentionImportService {

    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");

    private final GenerationMemberRepository generationMemberRepository;
    private final ClubAccessService clubAccessService;
    private final GenerationService generationService;

    public RetentionImportService(
            GenerationMemberRepository generationMemberRepository,
            ClubAccessService clubAccessService,
            GenerationService generationService
    ) {
        this.generationMemberRepository = generationMemberRepository;
        this.clubAccessService = clubAccessService;
        this.generationService = generationService;
    }

    public void requireClubAccess(String googleSub, UUID clubId) {
        clubAccessService.requireAccessibleClub(googleSub, clubId);
    }

    public RetentionPreviewResponse preview(
            String googleSub,
            UUID clubId,
            RetentionPreviewRequest request
    ) {
        requireClubAccess(googleSub, clubId);
        GenerationPair generations = requireGenerationPair(
                clubId, request.previousGenerationId(), request.targetGenerationId()
        );
        Map<String, Person> previousMembersByEmail = membersByEmail(generations.previous().getId());
        Set<UUID> targetMemberIds = memberIds(generations.target().getId());
        Map<String, Integer> emailCounts = normalizedEmailCounts(request.rows());

        List<RetentionPreviewRowResponse> rows = request.rows().stream()
                .map(row -> previewRow(row, emailCounts, previousMembersByEmail, targetMemberIds))
                .toList();
        return RetentionPreviewResponse.from(rows);
    }

    @Transactional
    public RetentionApplyResponse apply(
            String googleSub,
            UUID clubId,
            RetentionApplyRequest request
    ) {
        requireClubAccess(googleSub, clubId);
        GenerationPair generations = requireGenerationPair(
                clubId, request.previousGenerationId(), request.targetGenerationId()
        );
        Map<UUID, Person> previousMembersById = membersById(generations.previous().getId());
        Set<UUID> targetMemberIds = memberIds(generations.target().getId());
        LinkedHashSet<UUID> requestedIds = new LinkedHashSet<>(request.personIds());

        int createdCount = 0;
        int alreadyMemberCount = 0;
        for (UUID personId : requestedIds) {
            Person person = previousMembersById.get(personId);
            if (person == null) {
                throw new NotFoundException("이전 학기 부원에서 이월 대상을 찾을 수 없습니다.");
            }
            if (targetMemberIds.contains(personId)) {
                alreadyMemberCount++;
                continue;
            }
            generationMemberRepository.save(GenerationMember.createFromRetention(generations.target(), person));
            targetMemberIds.add(personId);
            createdCount++;
        }
        return new RetentionApplyResponse(requestedIds.size(), createdCount, alreadyMemberCount);
    }

    private GenerationPair requireGenerationPair(UUID clubId, UUID previousGenerationId, UUID targetGenerationId) {
        if (previousGenerationId.equals(targetGenerationId)) {
            throw new ConflictException("이전 학기와 대상 학기는 달라야 합니다.");
        }
        Generation previous = generationService.requireGenerationInClub(previousGenerationId, clubId);
        Generation target = generationService.requireGenerationInClub(targetGenerationId, clubId);
        if (previous.getStatus() != GenerationStatus.CLOSED) {
            throw new ConflictException("이전 학기를 종료한 뒤 부원을 이월해 주세요.");
        }
        if (target.getStatus() != GenerationStatus.ACTIVE) {
            throw new ConflictException("활성 학기로만 부원을 이월할 수 있습니다.");
        }
        return new GenerationPair(previous, target);
    }

    private RetentionPreviewRowResponse previewRow(
            RetentionImportRowRequest row,
            Map<String, Integer> emailCounts,
            Map<String, Person> previousMembersByEmail,
            Set<UUID> targetMemberIds
    ) {
        String email = normalizeEmail(row.email());
        String name = normalizeNullable(row.name());
        String studentNumber = normalizeNullable(row.studentNumber());
        if (email == null || !EMAIL_PATTERN.matcher(email).matches()) {
            return result(row, name, email, studentNumber, null, RetentionRowStatus.INVALID,
                    "이메일을 확인해 주세요.");
        }
        if (!Boolean.TRUE.equals(row.retained())) {
            return result(row, name, email, studentNumber, null, RetentionRowStatus.NOT_RETAINED,
                    "잔류하지 않는 응답입니다.");
        }
        if (emailCounts.getOrDefault(email, 0) > 1) {
            return result(row, name, email, studentNumber, null, RetentionRowStatus.DUPLICATE_IN_SOURCE,
                    "같은 원본에 동일한 이메일이 여러 번 있습니다.");
        }
        Person person = previousMembersByEmail.get(email);
        if (person == null) {
            return result(row, name, email, studentNumber, null, RetentionRowStatus.NOT_PREVIOUS_MEMBER,
                    "이전 학기 부원에서 찾을 수 없습니다.");
        }
        if (targetMemberIds.contains(person.getId())) {
            return result(row, name, email, studentNumber, person.getId(), RetentionRowStatus.ALREADY_TARGET_MEMBER,
                    "이미 대상 학기에 등록된 부원입니다.");
        }
        return result(row, name, email, studentNumber, person.getId(), RetentionRowStatus.READY,
                "이월할 수 있습니다.");
    }

    private RetentionPreviewRowResponse result(
            RetentionImportRowRequest source,
            String name,
            String email,
            String studentNumber,
            UUID personId,
            RetentionRowStatus status,
            String message
    ) {
        return new RetentionPreviewRowResponse(
                source.rowNumber(), name, email, studentNumber, personId, status, message
        );
    }

    private Map<String, Person> membersByEmail(UUID generationId) {
        Map<String, Person> members = new HashMap<>();
        generationMemberRepository.findAllByGenerationIdWithPerson(generationId)
                .forEach(member -> members.put(member.getPerson().getEmail(), member.getPerson()));
        return members;
    }

    private Map<UUID, Person> membersById(UUID generationId) {
        Map<UUID, Person> members = new HashMap<>();
        generationMemberRepository.findAllByGenerationIdWithPerson(generationId)
                .forEach(member -> members.put(member.getPerson().getId(), member.getPerson()));
        return members;
    }

    private Set<UUID> memberIds(UUID generationId) {
        Set<UUID> memberIds = new HashSet<>();
        generationMemberRepository.findAllByGenerationIdWithPerson(generationId)
                .forEach(member -> memberIds.add(member.getPerson().getId()));
        return memberIds;
    }

    private Map<String, Integer> normalizedEmailCounts(List<RetentionImportRowRequest> rows) {
        Map<String, Integer> counts = new HashMap<>();
        rows.stream()
                .filter(row -> Boolean.TRUE.equals(row.retained()))
                .map(RetentionImportRowRequest::email)
                .map(this::normalizeEmail)
                .filter(email -> email != null)
                .forEach(email -> counts.merge(email, 1, Integer::sum));
        return counts;
    }

    private String normalizeEmail(String value) {
        return value == null || value.isBlank() ? null : value.trim().toLowerCase(Locale.ROOT);
    }

    private String normalizeNullable(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private record GenerationPair(Generation previous, Generation target) {
    }
}
