package com.fluenta.api.web;

import com.fluenta.api.config.CurrentUser;
import com.fluenta.api.domain.UserEntity;
import com.fluenta.api.dto.UserSummary;
import com.fluenta.api.repo.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Admin user directory. Admin endpoints require an admin role, enforced via {@link CurrentUser#requireAdmin()}.
 */
@RestController
@RequestMapping("/api/admin/users")
public class AdminUserController {

    private final UserRepository users;

    public AdminUserController(UserRepository users) {
        this.users = users;
    }

    @GetMapping
    public Map<String, Object> list(@RequestParam(required = false) String query,
                                    @RequestParam(required = false) String plan,
                                    @RequestParam(required = false) Boolean verified,
                                    @RequestParam(defaultValue = "0") int page,
                                    @RequestParam(defaultValue = "20") int size) {
        CurrentUser.requireAdmin();
        int capped = Math.max(1, Math.min(size, 100));
        String q = (query == null || query.isBlank()) ? null : "%" + query.trim().toLowerCase() + "%";
        String planFilter = (plan == null || plan.isBlank()) ? null : plan;
        Page<UserEntity> result = users.search(q, planFilter, verified,
                PageRequest.of(Math.max(0, page), capped, Sort.by("name")));
        List<UserSummary> items = result.getContent().stream().map(this::toSummary).toList();
        return Map.of("items", items, "total", result.getTotalElements(), "page", page, "size", capped);
    }

    @PatchMapping("/{id}")
    public UserSummary patch(@PathVariable String id, @RequestBody Map<String, Object> body) {
        String actingUserId = CurrentUser.requireAdmin();
        UserEntity u = users.findById(id).orElseThrow(() -> ApiException.notFound("User"));
        Object v = body.get("emailVerified");
        if (v instanceof Boolean b) u.setEmailVerified(b);
        Object r = body.get("role");
        if (r instanceof String role) {
            if (!role.equals("student") && !role.equals("admin"))
                throw ApiException.badRequest("Invalid role");
            boolean demoting = "admin".equals(u.getRole()) && "student".equals(role);
            if (demoting) {
                if (id.equals(actingUserId)) throw ApiException.badRequest("You can't remove your own admin role");
                long admins = users.findAll().stream().filter(x -> "admin".equals(x.getRole())).count();
                if (admins <= 1) throw ApiException.badRequest("Can't remove the last admin");
            }
            u.setRole(role);
        }
        return toSummary(users.save(u));
    }

    private UserSummary toSummary(UserEntity u) {
        return new UserSummary(u.getId(), u.getName(), u.getEmail(), u.getPlan(),
                u.getPlanLabel(), u.isEmailVerified(), u.isOnboarded(), u.getRole());
    }
}
