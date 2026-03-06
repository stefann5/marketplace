package com.platform.catalog.repository;

import com.platform.catalog.entity.Product;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface ProductRepository extends JpaRepository<Product, UUID> {
    Page<Product> findByTenantId(UUID tenantId, Pageable pageable);
    Optional<Product> findByIdAndTenantId(UUID id, UUID tenantId);
}
