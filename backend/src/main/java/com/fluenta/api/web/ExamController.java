package com.fluenta.api.web;

import com.fluenta.api.dto.ExamDto;
import com.fluenta.api.service.ExamService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/exams")
public class ExamController {

    private final ExamService exams;

    public ExamController(ExamService exams) {
        this.exams = exams;
    }

    @GetMapping
    public List<ExamDto> list(@RequestParam(required = false) String skill,
                              @RequestParam(required = false) String status,
                              @RequestParam(required = false) String scope) {
        return exams.list(skill, status, scope);
    }

    @GetMapping("/{id}")
    public ExamDto get(@PathVariable String id) {
        return exams.get(id);
    }

    @PostMapping
    public ExamDto create(@RequestBody ExamDto body) {
        return exams.create(body);
    }

    @PutMapping("/{id}")
    public ExamDto update(@PathVariable String id, @RequestBody ExamDto body) {
        return exams.update(id, body);
    }

    @DeleteMapping("/{id}")
    public Map<String, Object> delete(@PathVariable String id) {
        exams.delete(id);
        return Map.of("ok", true);
    }

    @PostMapping("/{id}/duplicate")
    public ExamDto duplicate(@PathVariable String id) {
        return exams.duplicate(id);
    }

    @PostMapping("/{id}/status")
    public ExamDto setStatus(@PathVariable String id, @RequestBody Map<String, String> body) {
        return exams.setStatus(id, body.get("status"));
    }
}
