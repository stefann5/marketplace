package com.platform.analytics.config;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.index.Index;

@Configuration
@RequiredArgsConstructor
public class MongoConfig {

    private final MongoTemplate mongoTemplate;

    @PostConstruct
    public void createIndexes() {
        mongoTemplate.indexOps("analytics_events")
                .ensureIndex(new Index()
                        .on("tenantId", Sort.Direction.ASC)
                        .on("eventType", Sort.Direction.ASC)
                        .on("timestamp", Sort.Direction.DESC));
        mongoTemplate.indexOps("analytics_events")
                .ensureIndex(new Index()
                        .on("tenantId", Sort.Direction.ASC)
                        .on("eventType", Sort.Direction.ASC)
                        .on("productId", Sort.Direction.ASC));
        mongoTemplate.indexOps("analytics_events")
                .ensureIndex(new Index()
                        .on("eventType", Sort.Direction.ASC)
                        .on("categoryId", Sort.Direction.ASC));
    }
}
