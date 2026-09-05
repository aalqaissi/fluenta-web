package com.fluenta.api.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** A graded reading/listening attempt. Scoring is computed server-side ({@code ScoringService}). */
@Entity
@Table(name = "attempts")
public class AttemptEntity {

    @Id
    private String id;

    private String userId;
    private String examId;
    private String examTitle; // snapshot for listing
    private String skill;     // reading | listening

    @Column(columnDefinition = "text")
    private String answers;   // JSON: { questionId: answer }

    private int correct;
    private int total;
    private double band;
    private int durationUsedSec;
    private String createdAt; // ISO

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public String getExamId() { return examId; }
    public void setExamId(String examId) { this.examId = examId; }
    public String getExamTitle() { return examTitle; }
    public void setExamTitle(String examTitle) { this.examTitle = examTitle; }
    public String getSkill() { return skill; }
    public void setSkill(String skill) { this.skill = skill; }
    public String getAnswers() { return answers; }
    public void setAnswers(String answers) { this.answers = answers; }
    public int getCorrect() { return correct; }
    public void setCorrect(int correct) { this.correct = correct; }
    public int getTotal() { return total; }
    public void setTotal(int total) { this.total = total; }
    public double getBand() { return band; }
    public void setBand(double band) { this.band = band; }
    public int getDurationUsedSec() { return durationUsedSec; }
    public void setDurationUsedSec(int durationUsedSec) { this.durationUsedSec = durationUsedSec; }
    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }
}
