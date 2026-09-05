package com.fluenta.api.repo;

import com.fluenta.api.domain.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<UserEntity, String> {
    Optional<UserEntity> findFirstByEmailIgnoreCase(String email);
}
