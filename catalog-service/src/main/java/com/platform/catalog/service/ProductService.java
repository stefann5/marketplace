package com.platform.catalog.service;

import com.platform.catalog.dto.ProductRequest;
import com.platform.catalog.dto.ProductResponse;
import com.platform.catalog.entity.Product;
import com.platform.catalog.exception.CatalogException;
import com.platform.catalog.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;
    private final MinioService minioService;

    @Transactional(readOnly = true)
    public Page<ProductResponse> getAllProducts(Pageable pageable) {
        return productRepository.findAll(pageable).map(ProductResponse::from);
    }

    @Transactional(readOnly = true)
    public ProductResponse getProduct(UUID id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new CatalogException("Product not found", HttpStatus.NOT_FOUND));
        return ProductResponse.from(product);
    }

    @Transactional(readOnly = true)
    public Page<ProductResponse> getSellerProducts(UUID tenantId, Pageable pageable) {
        return productRepository.findByTenantId(tenantId, pageable).map(ProductResponse::from);
    }

    @Transactional
    public ProductResponse createProduct(UUID tenantId, ProductRequest request) {
        Product product = new Product();
        product.setTenantId(tenantId);
        applyFields(product, request);
        productRepository.save(product);
        return ProductResponse.from(product);
    }

    @Transactional
    public ProductResponse updateProduct(UUID id, UUID tenantId, ProductRequest request) {
        Product product = getOwnedProduct(id, tenantId);
        applyFields(product, request);
        productRepository.save(product);
        return ProductResponse.from(product);
    }

    @Transactional
    public void deleteProduct(UUID id, UUID tenantId) {
        Product product = getOwnedProduct(id, tenantId);
        minioService.deleteImage(product.getImageUrl());
        productRepository.delete(product);
    }

    @Transactional
    public ProductResponse uploadImage(UUID id, UUID tenantId, MultipartFile file) {
        Product product = getOwnedProduct(id, tenantId);
        if (product.getImageUrl() != null) {
            minioService.deleteImage(product.getImageUrl());
        }
        String url = minioService.uploadImage(id, file);
        product.setImageUrl(url);
        productRepository.save(product);
        return ProductResponse.from(product);
    }

    private Product getOwnedProduct(UUID id, UUID tenantId) {
        return productRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new CatalogException("Product not found", HttpStatus.NOT_FOUND));
    }

    private void applyFields(Product product, ProductRequest request) {
        product.setName(request.name());
        product.setDescription(request.description());
        product.setPrice(request.price());
        product.setStock(request.stock());
        product.setCategoryId(request.categoryId());
    }
}
