package com.fluenta.api.config;

import com.fluenta.api.repo.SessionRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Simple bearer-token auth for the prototype. Resolves {@code Authorization: Bearer <token>} to a
 * user id via the session store and stashes it in {@link CurrentUser}. Public paths (auth, H2
 * console, CORS preflight) pass through untouched; other {@code /api} calls without a valid token
 * get a 401.
 */
@Component
@Order(1)
public class AuthFilter extends OncePerRequestFilter {

    private final SessionRepository sessions;

    public AuthFilter(SessionRepository sessions) {
        this.sessions = sessions;
    }

    private static boolean isPublic(HttpServletRequest req) {
        String path = req.getRequestURI();
        if ("OPTIONS".equalsIgnoreCase(req.getMethod())) return true;   // CORS preflight
        if (path.startsWith("/api/auth/")) return true;
        return !path.startsWith("/api/");                                // non-API (e.g. h2-console)
    }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        try {
            String header = req.getHeader("Authorization");
            if (header != null && header.startsWith("Bearer ")) {
                String token = header.substring(7).trim();
                sessions.findById(token).ifPresent(s -> CurrentUser.set(s.getUserId()));
            }

            if (!isPublic(req) && CurrentUser.get() == null) {
                res.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                res.setContentType("application/json");
                res.getWriter().write("{\"error\":\"Not authenticated\"}");
                return;
            }
            chain.doFilter(req, res);
        } finally {
            CurrentUser.clear();
        }
    }
}
