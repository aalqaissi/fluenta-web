package com.fluenta.api.service;

import com.fluenta.api.domain.UserEntity;
import com.fluenta.api.dto.UserDto;
import com.fluenta.api.dto.UserPatch;
import com.fluenta.api.repo.UserRepository;
import com.fluenta.api.web.ApiException;
import org.springframework.stereotype.Service;

@Service
public class UserService {

    private final UserRepository users;
    private final Mappers mappers;
    private final Json json;

    public UserService(UserRepository users, Mappers mappers, Json json) {
        this.users = users;
        this.mappers = mappers;
        this.json = json;
    }

    public UserDto get(String userId) {
        return mappers.toDto(load(userId));
    }

    public UserDto patch(String userId, UserPatch patch) {
        UserEntity u = load(userId);
        if (patch.name() != null) u.setName(patch.name());
        if (patch.plan() != null) u.setPlan(patch.plan());
        if (patch.planLabel() != null) u.setPlanLabel(patch.planLabel());
        if (patch.renewsInDays() != null) u.setRenewsInDays(patch.renewsInDays());
        if (patch.targetBand() != null) u.setTargetBand(patch.targetBand());
        if (patch.examDate() != null) u.setExamDate(patch.examDate().isBlank() ? null : patch.examDate());
        if (patch.saveHistory() != null) u.setSaveHistory(patch.saveHistory());
        if (patch.track() != null) u.setTrack(patch.track());
        if (patch.examType() != null) u.setExamType(patch.examType());
        if (patch.purpose() != null) u.setPurpose(patch.purpose());
        if (patch.level() != null) u.setLevel(patch.level());
        if (patch.onboarded() != null) u.setOnboarded(patch.onboarded());
        if (patch.streak() != null) u.setStreak(json.write(patch.streak()));
        users.save(u);
        return mappers.toDto(u);
    }

    private UserEntity load(String userId) {
        return users.findById(userId).orElseThrow(() -> ApiException.notFound("User"));
    }
}
