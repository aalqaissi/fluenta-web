package com.fluenta.api.service;

import com.fluenta.api.domain.SessionEntity;
import com.fluenta.api.domain.UserEntity;
import com.fluenta.api.dto.AuthDtos.LoginResponse;
import com.fluenta.api.repo.SessionRepository;
import com.fluenta.api.repo.UserRepository;
import com.fluenta.api.web.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.UUID;
import java.util.regex.Pattern;

/** Real auth: register hashes a password; login verifies it. Sessions stay opaque bearer tokens. */
@Service
public class AuthService {

    private static final Pattern EMAIL = Pattern.compile("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$");

    /**
     * A real, valid BCrypt hash of a throwaway string — used only to run a dummy {@code matches}
     * comparison when there is no real user/hash, so an unknown-email response takes the same time
     * as a wrong-password response and doesn't leak whether an email is registered.
     */
    private static final String DUMMY_HASH = "$2a$10$Z/.tq7cpJsnJVQod9apw9O6fmLdaqld2hgLFont7A0W9Qww4lquQO";

    private final UserRepository users;
    private final SessionRepository sessions;
    private final Mappers mappers;
    private final BCryptPasswordEncoder encoder;

    public AuthService(UserRepository users, SessionRepository sessions, Mappers mappers, BCryptPasswordEncoder encoder) {
        this.users = users;
        this.sessions = sessions;
        this.mappers = mappers;
        this.encoder = encoder;
    }

    public LoginResponse login(String email, String password) {
        UserEntity user = (email == null ? null : users.findFirstByEmailIgnoreCase(email.trim()).orElse(null));
        String hash = (user == null || user.getPasswordHash() == null) ? DUMMY_HASH : user.getPasswordHash();
        // Always run one BCrypt comparison, even for an unknown email or a user with no password set,
        // so the timing is the same as a wrong-password failure and doesn't leak account existence.
        boolean matches = encoder.matches(password == null ? "" : password, hash);
        if (user == null || user.getPasswordHash() == null || !matches) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Incorrect email or password");
        }
        return session(user);
    }

    public LoginResponse register(String email, String password, String name) {
        String e = email == null ? "" : email.trim();
        if (!EMAIL.matcher(e).matches()) throw new ApiException(HttpStatus.BAD_REQUEST, "Enter a valid email address");
        if (password == null || password.length() < 8) throw new ApiException(HttpStatus.BAD_REQUEST, "Password must be at least 8 characters");
        String nm = name == null ? "" : name.trim();
        if (nm.isBlank()) throw new ApiException(HttpStatus.BAD_REQUEST, "Enter your name");
        if (users.findFirstByEmailIgnoreCase(e).isPresent())
            throw new ApiException(HttpStatus.CONFLICT, "That email is already registered.");

        UserEntity u = new UserEntity();
        u.setId("u-" + UUID.randomUUID().toString().substring(0, 8));
        u.setEmail(e);
        u.setName(nm);
        u.setInitials(nm.length() >= 2 ? nm.substring(0, 2).toUpperCase() : nm.toUpperCase());
        u.setPasswordHash(encoder.encode(password));
        u.setEmailVerified(false);
        u.setPlan("free");
        u.setPlanLabel("Free");
        u.setRenewsInDays(0);
        u.setTargetBand(6.5);
        u.setSaveHistory(true);
        u.setTrack("ielts");
        u.setOnboarded(false);
        u.setStreak("{\"current\":0,\"best\":0,\"last30\":[]}");
        return session(users.save(u));
    }

    public void logout(String token) {
        if (token != null) sessions.deleteById(token);
    }

    private LoginResponse session(UserEntity user) {
        String token = "yalla_" + UUID.randomUUID().toString().replace("-", "");
        sessions.save(new SessionEntity(token, user.getId(), Instant.now().toString()));
        return new LoginResponse(token, mappers.toDto(user));
    }
}
