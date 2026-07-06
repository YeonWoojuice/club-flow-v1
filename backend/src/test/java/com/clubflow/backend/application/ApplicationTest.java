package com.clubflow.backend.application;

import com.clubflow.backend.common.ConflictException;
import com.clubflow.backend.generation.Generation;
import com.clubflow.backend.person.Person;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;

class ApplicationTest {

    @Test
    void 최종_상태는_다른_상태로_변경할_수_없다() {
        Application application = Application.createManual(
                mock(Generation.class),
                mock(Person.class)
        );
        application.changeStatus(ApplicationStatus.ACCEPTED);

        assertThatThrownBy(() -> application.changeStatus(ApplicationStatus.REJECTED))
                .isInstanceOf(ConflictException.class)
                .hasMessage("최종 처리된 지원 상태는 변경할 수 없습니다.");
    }

    @Test
    void 같은_최종_상태를_다시_요청하면_멱등하게_처리한다() {
        Application application = Application.createManual(
                mock(Generation.class),
                mock(Person.class)
        );
        application.changeStatus(ApplicationStatus.ACCEPTED);

        assertThatCode(() -> application.changeStatus(ApplicationStatus.ACCEPTED))
                .doesNotThrowAnyException();
        assertThat(application.getStatus()).isEqualTo(ApplicationStatus.ACCEPTED);
    }
}
