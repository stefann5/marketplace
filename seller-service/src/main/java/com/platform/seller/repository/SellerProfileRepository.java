package com.platform.seller.repository;

import com.platform.seller.entity.SellerProfile;
import com.platform.seller.enums.SellerStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SellerProfileRepository extends JpaRepository<SellerProfile, UUID> {
    Optional<SellerProfile> findByUserId(UUID userId);
    Optional<SellerProfile> findBySlug(String slug);
    Optional<SellerProfile> findByTenantId(UUID tenantId);
    List<SellerProfile> findByStatus(SellerStatus status);
    boolean existsBySlug(String slug);
    boolean existsByUserId(UUID userId);
}
