package com.clubflow.backend.application.email;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class ApplicationResultEmailQueryService {

    private final ApplicationResultEmailMessageRepository messageRepository;

    public ApplicationResultEmailQueryService(ApplicationResultEmailMessageRepository messageRepository) {
        this.messageRepository = messageRepository;
    }

    public Map<UUID, ResultEmailState> latestStates(Set<UUID> applicationIds) {
        if (applicationIds.isEmpty()) return Map.of();
        Map<UUID, ResultEmailState> states = new HashMap<>();
        messageRepository.findAllByApplication_IdInOrderByCreatedAtDesc(applicationIds)
                .forEach(message -> states.putIfAbsent(
                        message.getApplicationId(),
                        new ResultEmailState(
                                ApplicationResultEmailStatus.from(message.getStatus()),
                                message.getSentAt()
                        )
                ));
        return states;
    }

    public record ResultEmailState(ApplicationResultEmailStatus status, Instant sentAt) {
        public static ResultEmailState notSent() {
            return new ResultEmailState(ApplicationResultEmailStatus.NOT_SENT, null);
        }
    }
}
