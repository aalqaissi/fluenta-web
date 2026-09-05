package com.fluenta.api.repo;

import com.fluenta.api.domain.CertificateEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CertificateRepository extends JpaRepository<CertificateEntity, String> {
    List<CertificateEntity> findByUserIdOrderByIssuedOnDesc(String userId);
}
