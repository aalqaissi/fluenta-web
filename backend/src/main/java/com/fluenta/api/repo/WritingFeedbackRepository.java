package com.fluenta.api.repo;

import com.fluenta.api.domain.WritingFeedbackEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface WritingFeedbackRepository extends JpaRepository<WritingFeedbackEntity, String> {
    List<WritingFeedbackEntity> findByUserIdOrderByCreatedAtDesc(String userId);
}
