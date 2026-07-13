package com.clubflow.backend.generation;

import com.clubflow.backend.club.Club;
import com.clubflow.backend.club.ClubAccessService;
import com.clubflow.backend.common.ConflictException;
import com.clubflow.backend.common.NotFoundException;
import com.clubflow.backend.generation.dto.CreateGenerationRequest;
import com.clubflow.backend.generation.dto.GenerationResponse;
import com.clubflow.backend.generation.dto.UpdateGenerationRequest;
import com.clubflow.backend.user.User;
import com.clubflow.backend.user.UserService;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.PessimisticLockingFailureException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class GenerationService {

    private final GenerationRepository generationRepository;
    private final ClubAccessService clubAccessService;
    private final UserService userService;

    public GenerationService(
            GenerationRepository generationRepository,
            ClubAccessService clubAccessService,
            UserService userService
    ) {
        this.generationRepository = generationRepository;
        this.clubAccessService = clubAccessService;
        this.userService = userService;
    }

    public List<GenerationResponse> list(String googleSub, UUID clubId) {
        clubAccessService.requireAccessibleClub(googleSub, clubId);
        return generationRepository.findAllByClubIdOrderByCreatedAtDesc(clubId)
                .stream()
                .map(GenerationResponse::from)
                .toList();
    }

    @Transactional
    public GenerationResponse create(String googleSub, UUID clubId, CreateGenerationRequest request) {
        Club club = clubAccessService.requireAccessibleClub(googleSub, clubId);
        if (generationRepository.existsByClubIdAndStatus(clubId, GenerationStatus.ACTIVE)) {
            throw new ConflictException("활성 상태인 학기가 이미 존재합니다. 기존 학기를 먼저 종료해 주세요.");
        }
        User currentUser = userService.getByGoogleSub(googleSub);
        Generation generation = generationRepository.save(Generation.create(
                club,
                request.name(),
                request.startDate(),
                request.endDate(),
                currentUser
        ));
        return GenerationResponse.from(generation);
    }

    @Transactional
    public GenerationResponse update(
            String googleSub,
            UUID generationId,
            UpdateGenerationRequest request
    ) {
        Generation generation = generationRepository.findById(generationId)
                .orElseThrow(() -> new NotFoundException("학기를 찾을 수 없습니다."));
        clubAccessService.requireAccessibleClub(googleSub, generation.getClub().getId());
        generation.update(request.name(), request.startDate(), request.endDate(), request.status());
        return GenerationResponse.from(generation);
    }

    @Transactional
    public GenerationResponse activate(String googleSub, UUID generationId) {
        Generation requestedGeneration = generationRepository.findById(generationId)
                .orElseThrow(() -> new NotFoundException("학기를 찾을 수 없습니다."));
        UUID clubId = requestedGeneration.getClub().getId();
        clubAccessService.requireAccessibleClub(googleSub, clubId);

        try {
            List<Generation> generations = generationRepository.findAllForUpdateByClubId(clubId);
            Generation target = generations.stream()
                    .filter(generation -> generationId.equals(generation.getId()))
                    .findFirst()
                    .orElseThrow(() -> new NotFoundException("학기를 찾을 수 없습니다."));

            if (target.getStatus() == GenerationStatus.ACTIVE) {
                throw new ConflictException("이미 활성 상태인 학기입니다.");
            }

            generations.stream()
                    .filter(generation -> generation.getStatus() == GenerationStatus.ACTIVE)
                    .forEach(Generation::close);
            generationRepository.flush();

            target.activate();
            generationRepository.flush();
            return GenerationResponse.from(target);
        } catch (DataIntegrityViolationException | PessimisticLockingFailureException exception) {
            throw new ConflictException("다른 운영진이 활성 학기를 변경했습니다. 새로고침 후 다시 시도해 주세요.");
        }
    }

    public Generation requireGenerationInClub(UUID generationId, UUID clubId) {
        return generationRepository.findByIdAndClubId(generationId, clubId)
                .orElseThrow(() -> new NotFoundException("해당 동아리의 학기를 찾을 수 없습니다."));
    }

    public Generation requireGenerationInClubForUpdate(UUID generationId, UUID clubId) {
        return generationRepository.findForUpdateByIdAndClubId(generationId, clubId)
                .orElseThrow(() -> new NotFoundException("해당 동아리의 학기를 찾을 수 없습니다."));
    }
}
