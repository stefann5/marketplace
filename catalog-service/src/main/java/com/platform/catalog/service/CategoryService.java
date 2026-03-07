package com.platform.catalog.service;

import com.platform.catalog.dto.CategoryResponse;
import com.platform.catalog.entity.Category;
import com.platform.catalog.exception.CatalogException;
import com.platform.catalog.repository.CategoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CategoryService {

    private final CategoryRepository categoryRepository;

    @Transactional(readOnly = true)
    public List<CategoryResponse> getAll() {
        List<Category> all = categoryRepository.findAll();
        return buildTree(all);
    }

    @Transactional(readOnly = true)
    public CategoryResponse getSubtree(Long id) {
        List<Category> subtree = categoryRepository.findSubtree(id);
        if (subtree.isEmpty()) {
            throw new CatalogException("Category not found", HttpStatus.NOT_FOUND);
        }
        List<CategoryResponse> tree = buildTree(subtree);
        return tree.stream()
                .filter(c -> c.id().equals(id))
                .findFirst()
                .orElseThrow(() -> new CatalogException("Category not found", HttpStatus.NOT_FOUND));
    }

    private List<CategoryResponse> buildTree(List<Category> categories) {
        Map<Long, List<Category>> childrenMap = categories.stream()
                .filter(c -> c.getParentId() != null)
                .collect(Collectors.groupingBy(Category::getParentId));

        Map<Long, Category> categoryMap = categories.stream()
                .collect(Collectors.toMap(Category::getId, c -> c));

        List<CategoryResponse> roots = new ArrayList<>();
        for (Category cat : categories) {
            if (cat.getParentId() == null || !categoryMap.containsKey(cat.getParentId())) {
                roots.add(buildNode(cat, childrenMap));
            }
        }
        return roots;
    }

    private CategoryResponse buildNode(Category category, Map<Long, List<Category>> childrenMap) {
        List<Category> children = childrenMap.getOrDefault(category.getId(), List.of());
        List<CategoryResponse> childResponses = children.stream()
                .map(c -> buildNode(c, childrenMap))
                .toList();
        return CategoryResponse.from(category, childResponses);
    }
}
