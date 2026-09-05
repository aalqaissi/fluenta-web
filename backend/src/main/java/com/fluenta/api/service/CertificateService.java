package com.fluenta.api.service;

import com.fluenta.api.domain.CertificateEntity;
import com.fluenta.api.dto.CertificateDto;
import com.fluenta.api.repo.CertificateRepository;
import com.fluenta.api.web.ApiException;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class CertificateService {

    private final CertificateRepository certs;
    private final Mappers mappers;

    public CertificateService(CertificateRepository certs, Mappers mappers) {
        this.certs = certs;
        this.mappers = mappers;
    }

    public List<CertificateDto> list(String userId) {
        return certs.findByUserIdOrderByIssuedOnDesc(userId).stream().map(mappers::toDto).toList();
    }

    public CertificateDto get(String userId, String id) {
        CertificateEntity c = require(id);
        if (c.getUserId() != null && !c.getUserId().equals(userId)) throw ApiException.notFound("Certificate");
        return mappers.toDto(c);
    }

    public CertificateDto save(String userId, CertificateDto dto) {
        CertificateEntity c = new CertificateEntity();
        mappers.apply(dto, c);
        if (c.getId() == null || c.getId().isBlank()) c.setId("cert-" + ExamService.uid());
        if (c.getVerificationNumber() == null || c.getVerificationNumber().isBlank()) {
            c.setVerificationNumber(newVerificationNumber());
        }
        c.setUserId(userId);
        return mappers.toDto(certs.save(c));
    }

    /** IELTS-style verification number, e.g. EIELTS-2026-049464. */
    static String newVerificationNumber() {
        int n = java.util.concurrent.ThreadLocalRandom.current().nextInt(0, 1_000_000);
        return "EIELTS-" + java.time.Year.now() + "-" + String.format("%06d", n);
    }

    public CertificateDto update(String userId, String id, CertificateDto dto) {
        require(id);
        CertificateEntity c = new CertificateEntity();
        mappers.apply(dto, c);
        c.setId(id);
        if (c.getVerificationNumber() == null || c.getVerificationNumber().isBlank()) {
            c.setVerificationNumber(newVerificationNumber());
        }
        c.setUserId(userId);
        return mappers.toDto(certs.save(c));
    }

    public void delete(String id) {
        certs.deleteById(id);
    }

    private CertificateEntity require(String id) {
        return certs.findById(id).orElseThrow(() -> ApiException.notFound("Certificate"));
    }
}
