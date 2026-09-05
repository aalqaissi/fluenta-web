package com.fluenta.api.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * A piece of student feedback. Lifecycle: {@code new → under_review → completed}. The student sees
 * their own feedback + status; an admin (Feedback Review) moves status and replies.
 */
@Entity
@Table(name = "feedback")
public class FeedbackEntity {

    @Id
    private String id;

    private String userId;
    private String userName;
    private String category;   // Suggestion | Bug | Praise | Question
    private String subject;

    @Column(columnDefinition = "text")
    private String message;

    private Integer rating;    // optional 1..5
    private String status;     // new | under_review | completed

    @Column(columnDefinition = "text")
    private String adminReply;

    private String createdAt;
    private String updatedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public String getUserName() { return userName; }
    public void setUserName(String userName) { this.userName = userName; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public String getSubject() { return subject; }
    public void setSubject(String subject) { this.subject = subject; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public Integer getRating() { return rating; }
    public void setRating(Integer rating) { this.rating = rating; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getAdminReply() { return adminReply; }
    public void setAdminReply(String adminReply) { this.adminReply = adminReply; }
    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }
    public String getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(String updatedAt) { this.updatedAt = updatedAt; }
}
