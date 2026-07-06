package com.clubflow.backend.member;

import com.clubflow.backend.club.ClubAccessService;
import com.clubflow.backend.generation.Generation;
import com.clubflow.backend.member.dto.GenerationMemberResponse;
import com.clubflow.backend.person.Person;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class GenerationMemberService {

    private final GenerationMemberRepository generationMemberRepository;
    private final ClubAccessService clubAccessService;

    public GenerationMemberService(
            GenerationMemberRepository generationMemberRepository,
            ClubAccessService clubAccessService
    ) {
        this.generationMemberRepository = generationMemberRepository;
        this.clubAccessService = clubAccessService;
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

    public List<GenerationMemberResponse> list(String googleSub, UUID clubId) {
        clubAccessService.requireAccessibleClub(googleSub, clubId);
        return generationMemberRepository.findAllByClubId(clubId)
                .stream()
                .map(GenerationMemberResponse::from)
                .toList();
    }
}
