package com.fluenta.api.config;

import com.fluenta.api.web.ApiException;
import org.springframework.http.HttpStatus;

/** Thread-local holder for the authenticated user id + role, set by {@link AuthFilter}. */
public final class CurrentUser {
    private static final ThreadLocal<String> USER_ID = new ThreadLocal<>();
    private static final ThreadLocal<String> ROLE = new ThreadLocal<>();

    private CurrentUser() {}

    public static void set(String userId) { USER_ID.set(userId); }
    public static void setRole(String role) { ROLE.set(role); }

    public static String get() { return USER_ID.get(); }
    public static String role() { return ROLE.get(); }

    /** The authenticated user id, or throw 401 if none. */
    public static String require() {
        String id = USER_ID.get();
        if (id == null) throw new ApiException(HttpStatus.UNAUTHORIZED, "Not authenticated");
        return id;
    }

    /** The authenticated user id if they are an admin; 401 if unauthenticated, 403 if not admin. */
    public static String requireAdmin() {
        String id = require();
        if (!"admin".equals(ROLE.get())) throw new ApiException(HttpStatus.FORBIDDEN, "Admin access required");
        return id;
    }

    public static void clear() { USER_ID.remove(); ROLE.remove(); }
}
