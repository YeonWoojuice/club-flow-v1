package com.clubflow.backend.application.email;

import com.clubflow.backend.application.Application;
import com.clubflow.backend.application.ApplicationRepository;
import com.clubflow.backend.application.ApplicationStatus;
import com.clubflow.backend.application.email.dto.ApplicationResultEmailRequest;
import com.clubflow.backend.club.Club;
import com.clubflow.backend.club.ClubAccessService;
import com.clubflow.backend.club.ClubStaff;
import com.clubflow.backend.common.ConflictException;
import com.clubflow.backend.generation.Generation;
import com.clubflow.backend.generation.GenerationService;
import com.clubflow.backend.person.Person;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ApplicationResultEmailPersistenceServiceTest {

    @Test
    void 선택_변수_값이_없는_지원자는_실제_발송_기록에서_제외한다() {
        ApplicationRepository applicationRepository = mock(ApplicationRepository.class);
        ApplicationResultEmailBatchRepository batchRepository = mock(ApplicationResultEmailBatchRepository.class);
        ApplicationResultEmailMessageRepository messageRepository = mock(ApplicationResultEmailMessageRepository.class);
        ApplicationResultEmailQueryService queryService = mock(ApplicationResultEmailQueryService.class);
        ClubAccessService clubAccessService = mock(ClubAccessService.class);
        GenerationService generationService = mock(GenerationService.class);
        ApplicationResultEmailPersistenceService service = new ApplicationResultEmailPersistenceService(
                applicationRepository,
                batchRepository,
                messageRepository,
                queryService,
                new ApplicationResultEmailTemplateRenderer(),
                clubAccessService,
                generationService
        );
        UUID clubId = UUID.randomUUID();
        UUID generationId = UUID.randomUUID();
        UUID applicationId = UUID.randomUUID();
        ClubStaff staff = mock(ClubStaff.class);
        Club club = mock(Club.class);
        Generation generation = mock(Generation.class);
        Person person = mock(Person.class);
        Application application = mock(Application.class);
        when(clubAccessService.requireApplicationResultEmailManager("google-sub", clubId)).thenReturn(staff);
        when(generationService.requireGenerationInClubForUpdate(generationId, clubId)).thenReturn(generation);
        when(generation.getId()).thenReturn(generationId);
        when(generation.getClub()).thenReturn(club);
        when(club.getName()).thenReturn("크루캣");
        when(application.getId()).thenReturn(applicationId);
        when(application.getGeneration()).thenReturn(generation);
        when(application.getPerson()).thenReturn(person);
        when(person.getName()).thenReturn("김지원");
        when(person.getDiscordName()).thenReturn(null);
        when(applicationRepository.findAllByGenerationIdAndStatusForUpdate(
                generationId, ApplicationStatus.ACCEPTED
        )).thenReturn(List.of(application));
        when(queryService.latestStates(java.util.Set.of(applicationId))).thenReturn(Map.of());
        ApplicationResultEmailRequest request = new ApplicationResultEmailRequest(
                generationId,
                ApplicationStatus.ACCEPTED,
                "[{{clubName}}] 합격 안내",
                "{{memberName}}님의 디스코드 이름은 {{discordName}}입니다.",
                null
        );

        assertThatThrownBy(() -> service.prepare("google-sub", clubId, request))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("필수 변수");
        verify(batchRepository, never()).save(org.mockito.ArgumentMatchers.any());
        verify(messageRepository, never()).saveAll(org.mockito.ArgumentMatchers.any());
    }
}
