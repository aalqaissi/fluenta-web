package com.fluenta.api.domain;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** A bearer-token session (simple prototype auth — token maps to a user id). */
@Entity
@Table(name = "sessions")
public class SessionEntity {

    @Id
    private String token;
    private String userId;
    private String createdAt;

    public SessionEntity() {}

    public SessionEntity(String token, String userId, String createdAt) {
        this.token = token;
        this.userId = userId;
        this.createdAt = createdAt;
    }

    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }
}
