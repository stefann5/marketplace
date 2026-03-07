package com.platform.catalog.repository;

import com.platform.catalog.entity.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface CategoryRepository extends JpaRepository<Category, Long> {

    List<Category> findByParentIdIsNull();

    List<Category> findByParentId(Long parentId);

    boolean existsByParentId(Long parentId);

    @Query(value = """
            WITH RECURSIVE subtree AS (
                SELECT id, name, parent_id FROM categories WHERE id = :id
                UNION ALL
                SELECT c.id, c.name, c.parent_id FROM categories c
                INNER JOIN subtree s ON c.parent_id = s.id
            )
            SELECT * FROM subtree
            """, nativeQuery = true)
    List<Category> findSubtree(@Param("id") Long id);
}
