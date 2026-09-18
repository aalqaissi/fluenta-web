package com.fluenta.api.domain;

import jakarta.persistence.*;

@Entity
@Table(name = "speaking_feedback")
public class SpeakingFeedbackEntity {
    @Id
    private String id;
    private String userId;
    private String examId;
    @Column(length = 40000)
    private String transcriptsJson;
    @Column(length = 40000)
    private String resultJson;
    private String model;
    private String source;
    private String createdAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public String getExamId() { return examId; }
    public void setExamId(String examId) { this.examId = examId; }
    public String getTranscriptsJson() { return transcriptsJson; }
    public void setTranscriptsJson(String v) { this.transcriptsJson = v; }
    public String getResultJson() { return resultJson; }
    public void setResultJson(String v) { this.resultJson = v; }
    public String getModel() { return model; }
    public void setModel(String model) { this.model = model; }
    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }
    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }
}
