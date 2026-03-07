package com.platform.catalog.service;

import com.platform.catalog.dto.ProductRequest;
import com.platform.catalog.dto.ProductResponse;
import com.platform.catalog.entity.Product;
import com.platform.catalog.entity.ProductImage;
import com.platform.catalog.exception.CatalogException;
import com.platform.catalog.repository.CategoryRepository;
import com.platform.catalog.repository.ProductImageRepository;
import com.platform.catalog.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;
    private final ProductImageRepository productImageRepository;
    private final CategoryRepository categoryRepository;
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
        minioService.deleteAllProductImages(id);
        productRepository.delete(product);
    }

    @Transactional
    public ProductResponse uploadImages(UUID id, UUID tenantId, List<MultipartFile> files) {
        Product product = getOwnedProduct(id, tenantId);
        int currentMax = product.getImages().stream()
                .mapToInt(ProductImage::getDisplayOrder)
                .max()
                .orElse(-1);

        for (MultipartFile file : files) {
            String url = minioService.uploadImage(id, file);
            ProductImage image = new ProductImage();
            image.setProduct(product);
            image.setImageUrl(url);
            image.setDisplayOrder(++currentMax);
            product.getImages().add(image);
        }

        productRepository.save(product);
        return ProductResponse.from(product);
    }

    @Transactional
    public ProductResponse deleteImage(UUID productId, UUID tenantId, UUID imageId) {
        Product product = getOwnedProduct(productId, tenantId);
        ProductImage image = product.getImages().stream()
                .filter(img -> img.getId().equals(imageId))
                .findFirst()
                .orElseThrow(() -> new CatalogException("Image not found", HttpStatus.NOT_FOUND));

        minioService.deleteImage(image.getImageUrl());
        product.getImages().remove(image);
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

        if (request.categoryId() != null) {
            categoryRepository.findById(request.categoryId())
                    .orElseThrow(() -> new CatalogException("Category not found", HttpStatus.NOT_FOUND));
            if (categoryRepository.existsByParentId(request.categoryId())) {
                throw new CatalogException("Products can only be assigned to leaf categories", HttpStatus.BAD_REQUEST);
            }
        }
        product.setCategoryId(request.categoryId());
    }
}
