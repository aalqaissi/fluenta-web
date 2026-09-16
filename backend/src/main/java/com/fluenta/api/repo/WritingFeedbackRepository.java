package com.fluenta.api.repo;

import com.fluenta.api.domain.WritingFeedbackEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WritingFeedbackRepository extends JpaRepository<WritingFeedbackEntity, String> {
}
