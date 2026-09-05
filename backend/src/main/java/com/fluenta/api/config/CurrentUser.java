package com.fluenta.api.config;

/** Thread-local holder for the authenticated user id, set by {@link AuthFilter}. */
public final class CurrentUser {
    private static final ThreadLocal<String> USER_ID = new ThreadLocal<>();

    private CurrentUser() {}

    public static void set(String userId) { USER_ID.set(userId); }

    public static String get() { return USER_ID.get(); }

    /** The authenticated user id, or throw 401 if none. */
    public static String require() {
        String id = USER_ID.get();
        if (id == null) {
            throw new com.fluenta.api.web.ApiException(org.springframework.http.HttpStatus.UNAUTHORIZED, "Not authenticated");
        }
        return id;
    }

    public static void clear() { USER_ID.remove(); }
}
