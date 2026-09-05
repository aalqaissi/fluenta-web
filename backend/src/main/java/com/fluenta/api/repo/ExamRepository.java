package com.fluenta.api.repo;

import com.fluenta.api.domain.ExamEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ExamRepository extends JpaRepository<ExamEntity, String> {
    List<ExamEntity> findBySkill(String skill);
    List<ExamEntity> findBySkillAndStatus(String skill, String status);
    List<ExamEntity> findByStatus(String status);
}
