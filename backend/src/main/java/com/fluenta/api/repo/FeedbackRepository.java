package com.fluenta.api.repo;

import com.fluenta.api.domain.FeedbackEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FeedbackRepository extends JpaRepository<FeedbackEntity, String> {
    List<FeedbackEntity> findByUserIdOrderByCreatedAtDesc(String userId);
    List<FeedbackEntity> findAllByOrderByCreatedAtDesc();
    long countByStatus(String status);
}
