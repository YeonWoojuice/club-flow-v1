package com.clubflow.backend.member;

import com.clubflow.backend.club.ClubAccessService;
import com.clubflow.backend.common.InvalidRequestException;
import com.clubflow.backend.common.NotFoundException;
import com.clubflow.backend.generation.Generation;
import com.clubflow.backend.generation.GenerationRepository;
import com.clubflow.backend.member.dto.ChangeGenerationMemberDuesStatusRequest;
import com.clubflow.backend.member.dto.ChangeGenerationMemberStatusRequest;
import com.clubflow.backend.member.dto.GenerationMemberResponse;
import com.clubflow.backend.member.dto.GenerationMemberStatusHistoryResponse;
import com.clubflow.backend.person.Person;
import com.clubflow.backend.user.User;
import com.clubflow.backend.user.UserService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class GenerationMemberService {

    private final GenerationMemberRepository generationMemberRepository;
    private final GenerationMemberStatusHistoryRepository statusHistoryRepository;
    private final ClubAccessService clubAccessService;
    private final UserService userService;
    private final GenerationRepository generationRepository;

    public GenerationMemberService(
            GenerationMemberRepository generationMemberRepository,
            GenerationMemberStatusHistoryRepository statusHistoryRepository,
            ClubAccessService clubAccessService,
            UserService userService,
            GenerationRepository generationRepository
    ) {
        this.generationMemberRepository = generationMemberRepository;
        this.statusHistoryRepository = statusHistoryRepository;
        this.clubAccessService = clubAccessService;
        this.userService = userService;
        this.generationRepository = generationRepository;
    }

    @Transactional
    public GenerationMember ensureAcceptedMember(Generation generation, Person person) {
        return generationMemberRepository.findByGenerationIdAndPersonId(
                        generation.getId(),
                        person.getId()
                )
                .orElseGet(() -> generationMemberRepository.save(
                        GenerationMember.createFromAcceptedApplication(generation, person)
                ));
    }

    public List<GenerationMemberResponse> list(String googleSub, UUID clubId, UUID generationId) {
        clubAccessService.requireAccessibleClub(googleSub, clubId);
        generationRepository.findByIdAndClubId(generationId, clubId)
                .orElseThrow(() -> new NotFoundException("해당 동아리의 학기를 찾을 수 없습니다."));
        return generationMemberRepository.findAllByGenerationIdWithPerson(generationId)
                .stream()
                .map(GenerationMemberResponse::from)
                .toList();
    }

    @Transactional
    public GenerationMemberResponse changeDuesStatus(
            String googleSub,
            UUID memberId,
            ChangeGenerationMemberDuesStatusRequest request
    ) {
        GenerationMember member = generationMemberRepository.findByIdForUpdate(memberId)
                .orElseThrow(() -> new NotFoundException("부원 정보를 찾을 수 없습니다."));
        clubAccessService.requireAccessibleClub(googleSub, member.getGeneration().getClub().getId());

        User changedBy = userService.getByGoogleSub(googleSub);
        member.changeDuesStatus(request.duesStatus(), changedBy);
        return GenerationMemberResponse.from(member);
    }

    @Transactional
    public GenerationMemberResponse changeStatus(
            String googleSub,
            UUID memberId,
            ChangeGenerationMemberStatusRequest request
    ) {
        GenerationMember member = generationMemberRepository.findByIdForUpdate(memberId)
                .orElseThrow(() -> new NotFoundException("부원 정보를 찾을 수 없습니다."));
        clubAccessService.requireAccessibleClub(googleSub, member.getGeneration().getClub().getId());

        GenerationMemberStatus previousStatus = member.getStatus();
        if (previousStatus == request.status()) {
            return GenerationMemberResponse.from(member);
        }

        String reason = normalizeReason(request.reason());
        if (request.status() == GenerationMemberStatus.WITHDRAWN && reason == null) {
            throw new InvalidRequestException("탈퇴 처리 사유를 입력해 주세요.");
        }
        if (reason != null && reason.length() > 500) {
            throw new InvalidRequestException("상태 변경 사유는 500자 이하로 입력해 주세요.");
        }

        User changedBy = userService.getByGoogleSub(googleSub);
        member.changeStatus(request.status());
        statusHistoryRepository.save(GenerationMemberStatusHistory.create(
                member,
                previousStatus,
                request.status(),
                reason,
                changedBy
        ));
        return GenerationMemberResponse.from(member);
    }

    public List<GenerationMemberStatusHistoryResponse> getStatusHistory(
            String googleSub,
            UUID memberId
    ) {
        GenerationMember member = generationMemberRepository.findById(memberId)
                .orElseThrow(() -> new NotFoundException("부원 정보를 찾을 수 없습니다."));
        clubAccessService.requireAccessibleClub(googleSub, member.getGeneration().getClub().getId());
        return statusHistoryRepository.findAllByMemberIdOrderByChangedAtDesc(memberId)
                .stream()
                .map(GenerationMemberStatusHistoryResponse::from)
                .toList();
    }

    private String normalizeReason(String reason) {
        return reason == null || reason.isBlank() ? null : reason.trim();
    }
}
