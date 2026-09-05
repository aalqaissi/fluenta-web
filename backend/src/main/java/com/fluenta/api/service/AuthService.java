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
        UserEntity user = (email == null ? null : users.findFirstByEmailIgnoreCase(email).orElse(null));
        if (user == null) {
            user = users.findById(DEFAULT_USER_ID)
                    .orElseThrow(() -> new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "No seeded user"));
        }
        String token = "fluenta_" + UUID.randomUUID().toString().replace("-", "");
        sessions.save(new SessionEntity(token, user.getId(), Instant.now().toString()));
        return new LoginResponse(token, mappers.toDto(user));
    }

    public void logout(String token) {
        if (token != null) sessions.deleteById(token);
    }
}
