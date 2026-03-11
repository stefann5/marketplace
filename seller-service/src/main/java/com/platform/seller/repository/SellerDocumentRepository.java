package com.platform.seller.repository;

import com.platform.seller.entity.SellerDocument;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface SellerDocumentRepository extends JpaRepository<SellerDocument, UUID> {
    List<SellerDocument> findBySellerId(UUID sellerId);
}
