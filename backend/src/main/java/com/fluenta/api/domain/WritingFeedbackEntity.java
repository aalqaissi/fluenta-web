package com.fluenta.api.domain;

import jakarta.persistence.*;

@Entity
@Table(name = "writing_feedback")
public class WritingFeedbackEntity {
    @Id
    private String id;
    private String userId;
    private String taskId;
    private Integer taskNumber;
    @Column(length = 20000)
    private String essay;
    @Column(length = 40000)
    private String resultJson;
    private String model;
    private String source;
    private String createdAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public String getTaskId() { return taskId; }
    public void setTaskId(String taskId) { this.taskId = taskId; }
    public Integer getTaskNumber() { return taskNumber; }
    public void setTaskNumber(Integer taskNumber) { this.taskNumber = taskNumber; }
    public String getEssay() { return essay; }
    public void setEssay(String essay) { this.essay = essay; }
    public String getResultJson() { return resultJson; }
    public void setResultJson(String resultJson) { this.resultJson = resultJson; }
    public String getModel() { return model; }
    public void setModel(String model) { this.model = model; }
    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }
    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }
}
