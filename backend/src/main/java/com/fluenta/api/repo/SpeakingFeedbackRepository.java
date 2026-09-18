package com.fluenta.api.repo;

import com.fluenta.api.domain.SpeakingFeedbackEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SpeakingFeedbackRepository extends JpaRepository<SpeakingFeedbackEntity, String> {
}
