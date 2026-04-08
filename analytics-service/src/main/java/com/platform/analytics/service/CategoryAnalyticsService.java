package com.platform.analytics.service;

import com.platform.analytics.dto.TopCategoryResponse;
import com.platform.analytics.model.EventType;
import lombok.RequiredArgsConstructor;
import org.bson.Document;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.aggregation.Aggregation;
import org.springframework.data.mongodb.core.aggregation.ArithmeticOperators;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CategoryAnalyticsService {

    private final MongoTemplate mongoTemplate;
    private static final String COLLECTION = "analytics_events";

    public List<TopCategoryResponse> getTopCategories(int limit) {
        Aggregation agg = Aggregation.newAggregation(
                Aggregation.match(Criteria.where("eventType").is(EventType.ORDER_PLACED.name())
                        .and("categoryId").ne(null)),
                Aggregation.group("categoryId")
                        .sum("quantity").as("totalUnits")
                        .sum(ArithmeticOperators.Multiply.valueOf("unitPrice").multiplyBy("quantity")).as("totalRevenue"),
                Aggregation.sort(Sort.Direction.DESC, "totalRevenue"),
                Aggregation.limit(limit)
        );

        var results = mongoTemplate.aggregate(agg, COLLECTION, Document.class).getMappedResults();
        return results.stream().map(doc -> new TopCategoryResponse(
                doc.get("_id", Number.class).longValue(),
                doc.get("totalUnits", Number.class).longValue(),
                BigDecimal.valueOf(doc.get("totalRevenue", Number.class).doubleValue()).setScale(2, RoundingMode.HALF_UP)
        )).toList();
    }
}
