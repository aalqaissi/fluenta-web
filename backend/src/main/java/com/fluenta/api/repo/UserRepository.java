package com.fluenta.api.repo;

import com.fluenta.api.domain.UserEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface UserRepository extends JpaRepository<UserEntity, String> {
    Optional<UserEntity> findFirstByEmailIgnoreCase(String email);

    @Query("SELECT u FROM UserEntity u WHERE " +
           "(:q IS NULL OR lower(u.name) LIKE :q OR lower(u.email) LIKE :q) AND " +
           "(:plan IS NULL OR u.plan = :plan) AND " +
           "(:verified IS NULL OR u.emailVerified = :verified)")
    Page<UserEntity> search(@Param("q") String q, @Param("plan") String plan,
                            @Param("verified") Boolean verified, Pageable pageable);
}
