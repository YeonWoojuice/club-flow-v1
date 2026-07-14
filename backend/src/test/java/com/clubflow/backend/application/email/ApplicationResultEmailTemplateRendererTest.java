package com.clubflow.backend.application.email;

import com.clubflow.backend.application.Application;
import com.clubflow.backend.club.Club;
import com.clubflow.backend.common.InvalidRequestException;
import com.clubflow.backend.generation.Generation;
import com.clubflow.backend.person.Person;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ApplicationResultEmailTemplateRendererTest {

    private final ApplicationResultEmailTemplateRenderer renderer =
            new ApplicationResultEmailTemplateRenderer();

    @Test
    void 지원_결과_메일_변수를_수신자별_값으로_치환한다() {
        Application application = application("크루캣", "김지원", "crewcat_user");

        renderer.validate("[{{clubName}}] 결과", "{{memberName}} {{discordName}} {{kakaoLink}}", "https://open.kakao.com/o/example");
        RenderedEmail rendered = renderer.render(
                "[{{clubName}}] 결과",
                "{{memberName}} / {{discordName}} / {{kakaoLink}}",
                "https://open.kakao.com/o/example",
                application
        );

        assertThat(rendered.subject()).isEqualTo("[크루캣] 결과");
        assertThat(rendered.body()).isEqualTo("김지원 / crewcat_user / https://open.kakao.com/o/example");
    }

    @Test
    void 사용한_선택_변수_값이_없으면_해당_수신자를_제외할_수_있게_실패한다() {
        Application application = application("크루캣", "김지원", null);

        assertThatThrownBy(() -> renderer.render(
                "지원 결과",
                "디스코드: {{discordName}}",
                null,
                application
        ))
                .isInstanceOf(MissingTemplateValueException.class)
                .hasMessageContaining("discordName");
    }

    @Test
    void 지원하지_않는_변수와_HTTPS가_아닌_링크를_거절한다() {
        assertThatThrownBy(() -> renderer.validate("{{unknown}}", "본문", null))
                .isInstanceOf(InvalidRequestException.class)
                .hasMessageContaining("지원하지 않는");
        assertThatThrownBy(() -> renderer.validate("제목", "본문", "http://open.kakao.com/o/example"))
                .isInstanceOf(InvalidRequestException.class)
                .hasMessageContaining("https");
    }

    private Application application(String clubName, String memberName, String discordName) {
        Club club = mock(Club.class);
        Generation generation = mock(Generation.class);
        Person person = mock(Person.class);
        Application application = mock(Application.class);
        when(club.getName()).thenReturn(clubName);
        when(generation.getClub()).thenReturn(club);
        when(person.getName()).thenReturn(memberName);
        when(person.getDiscordName()).thenReturn(discordName);
        when(application.getGeneration()).thenReturn(generation);
        when(application.getPerson()).thenReturn(person);
        return application;
    }
}
