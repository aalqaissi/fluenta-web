package com.fluenta.api.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * An exam — either Studio-authored (format {@code studio}, the FE {@code StudioExam} shape) or a
 * built-in demo exam (format {@code runner}, the FE runtime {@code ReadingExam}/{@code ListeningExam}
 * shape which already carries {@code correct} answers). The nested content is stored as JSON so the
 * schema stays stable as authoring fields evolve.
 */
@Entity
@Table(name = "exams")
public class ExamEntity {

    @Id
    private String id;

    private String skill;      // reading | writing | listening | speaking | full
    private String title;
    private String module;     // academic | general | both
    private String status;     // draft | published
    private String scope;      // global | user
    private int timeLimit;     // minutes
    private String updatedAt;  // ISO
    private String format;     // studio | runner

    @Column(columnDefinition = "text")
    private String content;    // JSON payload (passages/sections/writing/parts/full)

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getSkill() { return skill; }
    public void setSkill(String skill) { this.skill = skill; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getModule() { return module; }
    public void setModule(String module) { this.module = module; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getScope() { return scope; }
    public void setScope(String scope) { this.scope = scope; }
    public int getTimeLimit() { return timeLimit; }
    public void setTimeLimit(int timeLimit) { this.timeLimit = timeLimit; }
    public String getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(String updatedAt) { this.updatedAt = updatedAt; }
    public String getFormat() { return format; }
    public void setFormat(String format) { this.format = format; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
}
