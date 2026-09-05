package com.fluenta.api.web;

import com.fluenta.api.config.CurrentUser;
import com.fluenta.api.dto.UserDto;
import com.fluenta.api.dto.UserPatch;
import com.fluenta.api.service.UserService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/me")
public class UserController {

    private final UserService users;

    public UserController(UserService users) {
        this.users = users;
    }

    @GetMapping
    public UserDto me() {
        return users.get(CurrentUser.require());
    }

    @PatchMapping
    public UserDto patch(@RequestBody UserPatch patch) {
        return users.patch(CurrentUser.require(), patch);
    }
}
