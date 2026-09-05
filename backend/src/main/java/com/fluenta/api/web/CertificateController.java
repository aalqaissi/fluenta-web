package com.fluenta.api.web;

import com.fluenta.api.config.CurrentUser;
import com.fluenta.api.dto.CertificateDto;
import com.fluenta.api.service.CertificateService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/certificates")
public class CertificateController {

    private final CertificateService certs;

    public CertificateController(CertificateService certs) {
        this.certs = certs;
    }

    @GetMapping
    public List<CertificateDto> list() {
        return certs.list(CurrentUser.require());
    }

    @GetMapping("/{id}")
    public CertificateDto get(@PathVariable String id) {
        return certs.get(CurrentUser.require(), id);
    }

    @PostMapping
    public CertificateDto create(@RequestBody CertificateDto body) {
        return certs.save(CurrentUser.require(), body);
    }

    @PutMapping("/{id}")
    public CertificateDto update(@PathVariable String id, @RequestBody CertificateDto body) {
        return certs.update(CurrentUser.require(), id, body);
    }

    @DeleteMapping("/{id}")
    public Map<String, Object> delete(@PathVariable String id) {
        certs.delete(id);
        return Map.of("ok", true);
    }
}
