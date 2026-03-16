package com.platform.catalog.service;

import com.platform.catalog.dto.*;
import com.platform.catalog.entity.Product;
import com.platform.catalog.entity.ProductImage;
import com.platform.catalog.exception.CatalogException;
import com.platform.catalog.repository.CategoryRepository;
import com.platform.catalog.repository.ProductImageRepository;
import com.platform.catalog.repository.ProductRepository;
import com.platform.catalog.specification.ProductSpecification;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;
    private final ProductImageRepository productImageRepository;
    private final CategoryRepository categoryRepository;
    private final MinioService minioService;

    @Transactional(readOnly = true)
    public Page<ProductResponse> searchProducts(ProductSearchCriteria criteria, Pageable pageable) {
        Specification<Product> spec = Specification.where(null);

        if (criteria.name() != null && !criteria.name().isBlank()) {
            spec = spec.and(ProductSpecification.hasNameLike(criteria.name()));
        }
        if (criteria.categoryId() != null) {
            List<Long> categoryIds = categoryRepository.findSubtree(criteria.categoryId())
                    .stream()
                    .map(c -> c.getId())
                    .collect(Collectors.toList());
            spec = spec.and(ProductSpecification.hasCategoryIn(categoryIds));
        }
        if (criteria.minPrice() != null) {
            spec = spec.and(ProductSpecification.hasMinPrice(criteria.minPrice()));
        }
        if (criteria.maxPrice() != null) {
            spec = spec.and(ProductSpecification.hasMaxPrice(criteria.maxPrice()));
        }
        if (criteria.minRating() != null) {
            spec = spec.and(ProductSpecification.hasMinRating(criteria.minRating()));
        }
        if (criteria.tenantId() != null) {
            spec = spec.and(ProductSpecification.hasTenantId(criteria.tenantId()));
        }

        Sort sort = resolveSort(criteria.sortBy(), criteria.sortDirection());
        Pageable sortedPageable = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), sort);

        return productRepository.findAll(spec, sortedPageable).map(ProductResponse::from);
    }

    private Sort resolveSort(String sortBy, String direction) {
        Sort.Direction dir = "asc".equalsIgnoreCase(direction) ? Sort.Direction.ASC : Sort.Direction.DESC;

        return switch (sortBy != null ? sortBy : "rating") {
            case "price" -> Sort.by(dir, "price");
            case "date" -> Sort.by(dir, "updatedAt");
            case "rating" -> Sort.by(dir, "averageRating");
            default -> Sort.by(Sort.Direction.DESC, "averageRating");
        };
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

    @Transactional(readOnly = true)
    public List<StockCheckResponse> checkStock(List<StockCheckRequest> requests) {
        List<UUID> ids = requests.stream().map(StockCheckRequest::productId).toList();
        Map<UUID, Product> products = productRepository.findAllByIdIn(ids).stream()
                .collect(Collectors.toMap(Product::getId, Function.identity()));

        return requests.stream().map(req -> {
            Product p = products.get(req.productId());
            if (p == null) return new StockCheckResponse(req.productId(), 0, false);
            return new StockCheckResponse(req.productId(), p.getStock(), p.getStock() >= req.requestedQuantity());
        }).toList();
    }

    @Transactional
    public void decrementStock(List<StockDecrementRequest> requests) {
        List<UUID> ids = requests.stream().map(StockDecrementRequest::productId).toList();
        Map<UUID, Product> products = productRepository.findAllByIdIn(ids).stream()
                .collect(Collectors.toMap(Product::getId, Function.identity()));

        for (StockDecrementRequest req : requests) {
            Product p = products.get(req.productId());
            if (p == null) throw new CatalogException("Product not found: " + req.productId(), HttpStatus.NOT_FOUND);
            if (p.getStock() < req.quantity()) throw new CatalogException("Insufficient stock for product: " + req.productId(), HttpStatus.CONFLICT);
            p.setStock(p.getStock() - req.quantity());
            p.setPurchaseCount(p.getPurchaseCount() + req.quantity());
        }
        productRepository.saveAll(products.values());
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
