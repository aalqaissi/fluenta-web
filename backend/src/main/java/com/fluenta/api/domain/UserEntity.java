package com.fluenta.api.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** A Fluenta user profile (mirrors the frontend {@code FluentaUser}). */
@Entity
@Table(name = "users")
public class UserEntity {

    @Id
    private String id;

    private String name;
    private String email;
    private String initials;
    private String avatarUrl;

    private String plan;          // "free" | "pro"
    private String planLabel;     // "Pro Monthly" | "Free" | ...
    private int renewsInDays;
    private double targetBand;
    private String examDate;      // ISO date or null
    private boolean saveHistory;

    /** JSON: { current, best, last30[] } */
    @Column(columnDefinition = "text")
    private String streak;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getInitials() { return initials; }
    public void setInitials(String initials) { this.initials = initials; }
    public String getAvatarUrl() { return avatarUrl; }
    public void setAvatarUrl(String avatarUrl) { this.avatarUrl = avatarUrl; }
    public String getPlan() { return plan; }
    public void setPlan(String plan) { this.plan = plan; }
    public String getPlanLabel() { return planLabel; }
    public void setPlanLabel(String planLabel) { this.planLabel = planLabel; }
    public int getRenewsInDays() { return renewsInDays; }
    public void setRenewsInDays(int renewsInDays) { this.renewsInDays = renewsInDays; }
    public double getTargetBand() { return targetBand; }
    public void setTargetBand(double targetBand) { this.targetBand = targetBand; }
    public String getExamDate() { return examDate; }
    public void setExamDate(String examDate) { this.examDate = examDate; }
    public boolean isSaveHistory() { return saveHistory; }
    public void setSaveHistory(boolean saveHistory) { this.saveHistory = saveHistory; }
    public String getStreak() { return streak; }
    public void setStreak(String streak) { this.streak = streak; }
}
