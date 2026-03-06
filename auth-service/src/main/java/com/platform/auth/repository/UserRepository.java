package com.platform.auth.repository;

import com.platform.auth.entity.User;
import com.platform.auth.enums.Role;
import com.platform.auth.enums.SellerStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
    List<User> findByRole(Role role);
    List<User> findByRoleAndSellerStatus(Role role, SellerStatus sellerStatus);
}
