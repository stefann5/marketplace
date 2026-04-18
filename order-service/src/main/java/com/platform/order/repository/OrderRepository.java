package com.platform.order.repository;

import com.platform.order.entity.Order;
import com.platform.order.enums.OrderStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

public interface OrderRepository extends JpaRepository<Order, UUID> {
    List<Order> findByUserIdOrderByCreatedAtDesc(UUID userId);
    List<Order> findByTenantIdOrderByCreatedAtDesc(UUID tenantId);
    List<Order> findByTenantIdAndStatusOrderByCreatedAtDesc(UUID tenantId, OrderStatus status);

    Page<Order> findByUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);
    Page<Order> findByTenantIdOrderByCreatedAtDesc(UUID tenantId, Pageable pageable);
    Page<Order> findByTenantIdAndStatusOrderByCreatedAtDesc(UUID tenantId, OrderStatus status, Pageable pageable);

    @Query("SELECT CASE WHEN COUNT(oi) > 0 THEN true ELSE false END FROM OrderItem oi WHERE oi.order.userId = :userId AND oi.productId = :productId")
    boolean existsByUserIdAndProductId(UUID userId, UUID productId);
}
