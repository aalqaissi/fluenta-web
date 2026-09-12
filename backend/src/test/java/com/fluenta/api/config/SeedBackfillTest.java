package com.fluenta.api.config;

import com.fluenta.api.domain.UserEntity;
import com.fluenta.api.repo.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Verifies SeedLoader#ensureDemoPassword backfills u1's passwordHash on a database that
 * predates real-auth (i.e. already has users, so the fresh-DB seedUser() path is skipped).
 *
 * Lives in com.fluenta.api.config (matching SeedLoader's package) so it can call the
 * package-visible ensureDemoPassword() directly.
 */
@SpringBootTest
class SeedBackfillTest {

    @Autowired UserRepository users;
    @Autowired BCryptPasswordEncoder encoder;
    @Autowired SeedLoader seedLoader;

    @Test
    void backfillsDemoPasswordWhenMissing() {
        UserEntity u1 = users.findById("u1").orElseThrow();
        u1.setPasswordHash(null);
        users.save(u1);

        seedLoader.ensureDemoPassword();

        UserEntity reloaded = users.findById("u1").orElseThrow();
        assertNotNull(reloaded.getPasswordHash());
        assertTrue(encoder.matches("yalla-demo", reloaded.getPasswordHash()));
        assertTrue(reloaded.isEmailVerified());
    }
}
