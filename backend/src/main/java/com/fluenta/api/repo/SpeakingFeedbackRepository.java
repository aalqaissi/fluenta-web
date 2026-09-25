package com.fluenta.api.repo;

import com.fluenta.api.domain.SpeakingFeedbackEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SpeakingFeedbackRepository extends JpaRepository<SpeakingFeedbackEntity, String> {
    List<SpeakingFeedbackEntity> findByUserIdOrderByCreatedAtDesc(String userId);
}
