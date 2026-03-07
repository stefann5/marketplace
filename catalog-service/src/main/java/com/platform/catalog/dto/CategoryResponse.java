package com.platform.catalog.dto;

import com.platform.catalog.entity.Category;

import java.util.List;

public record CategoryResponse(
        Long id,
        String name,
        Long parentId,
        List<CategoryResponse> children
) {
    public static CategoryResponse from(Category c) {
        return new CategoryResponse(c.getId(), c.getName(), c.getParentId(), List.of());
    }

    public static CategoryResponse from(Category c, List<CategoryResponse> children) {
        return new CategoryResponse(c.getId(), c.getName(), c.getParentId(), children);
    }
}
