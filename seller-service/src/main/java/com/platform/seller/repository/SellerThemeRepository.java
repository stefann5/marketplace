package com.platform.seller.repository;

import com.platform.seller.entity.SellerTheme;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface SellerThemeRepository extends JpaRepository<SellerTheme, UUID> {
}
