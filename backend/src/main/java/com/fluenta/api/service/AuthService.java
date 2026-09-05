package com.fluenta.api.service;

import com.fluenta.api.domain.SessionEntity;
import com.fluenta.api.domain.UserEntity;
import com.fluenta.api.dto.AuthDtos.LoginResponse;
import com.fluenta.api.repo.SessionRepository;
import com.fluenta.api.repo.UserRepository;
import com.fluenta.api.web.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.UUID;

/**
 * Prototype auth: a login resolves to a user by email, falling back to the seeded default user so
 * the demo login always works. Passwords are not stored or checked at this stage (documented).
 */
@Service
public class AuthService {

    static final String DEFAULT_USER_ID = "u1";

    private final UserRepository users;
    private final SessionRepository sessions;
    private final Mappers mappers;

    public AuthService(UserRepository users, SessionRepository sessions, Mappers mappers) {
        this.users = users;
        this.sessions = sessions;
        this.mappers = mappers;
    }

    public LoginResponse login(String email) {
        UserEntity user;
        if (email == null || email.isBlank()) {
            // No email (e.g. the demo "Continue with Google") → the seeded, already-onboarded user.
            user = users.findById(DEFAULT_USER_ID)
                    .orElseThrow(() -> new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "No seeded user"));
        } else {
            user = users.findFirstByEmailIgnoreCase(email).orElseGet(() -> createUser(email));
        }
        String token = "yalla_" + UUID.randomUUID().toString().replace("-", "");
        sessions.save(new SessionEntity(token, user.getId(), Instant.now().toString()));
        return new LoginResponse(token, mappers.toDto(user));
    }

    /** Create a fresh, un-onboarded account for a new email (prototype: no password). */
    private UserEntity createUser(String email) {
        UserEntity u = new UserEntity();
        u.setId("u-" + UUID.randomUUID().toString().substring(0, 8));
        u.setEmail(email);
        String local = email.contains("@") ? email.substring(0, email.indexOf('@')) : email;
        String name = local.isBlank() ? "New Learner"
                : Character.toUpperCase(local.charAt(0)) + local.substring(1);
        u.setName(name);
        u.setInitials(name.length() >= 2 ? name.substring(0, 2).toUpperCase() : name.toUpperCase());
        u.setPlan("free");
        u.setPlanLabel("Free");
        u.setRenewsInDays(0);
        u.setTargetBand(6.5);
        u.setSaveHistory(true);
        u.setTrack("ielts");
        u.setOnboarded(false);
        u.setStreak("{\"current\":0,\"best\":0,\"last30\":[]}");
        return users.save(u);
    }

    public void logout(String token) {
        if (token != null) sessions.deleteById(token);
    }
}
