package com.fluenta.api.repo;

import com.fluenta.api.domain.AttemptEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AttemptRepository extends JpaRepository<AttemptEntity, String> {
    List<AttemptEntity> findByUserIdOrderByCreatedAtDesc(String userId);
    List<AttemptEntity> findByUserIdAndExamIdOrderByCreatedAtDesc(String userId, String examId);
}
