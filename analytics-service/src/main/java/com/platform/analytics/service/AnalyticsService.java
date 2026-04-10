package com.platform.analytics.service;

import com.platform.analytics.dto.*;
import com.platform.analytics.model.EventType;
import lombok.RequiredArgsConstructor;
import org.bson.Document;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.aggregation.*;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AnalyticsService {

    private final MongoTemplate mongoTemplate;
    private static final String COLLECTION = "analytics_events";

    public RevenueSummaryResponse getRevenueSummary(String tenantId) {
        Instant now = Instant.now();
        ZonedDateTime zdt = now.atZone(ZoneOffset.UTC);

        Instant startOfDay = zdt.toLocalDate().atStartOfDay(ZoneOffset.UTC).toInstant();
        Instant startOfWeek = zdt.toLocalDate().with(java.time.DayOfWeek.MONDAY).atStartOfDay(ZoneOffset.UTC).toInstant();
        Instant startOfMonth = zdt.withDayOfMonth(1).toLocalDate().atStartOfDay(ZoneOffset.UTC).toInstant();
        Instant startOfYear = zdt.withDayOfYear(1).toLocalDate().atStartOfDay(ZoneOffset.UTC).toInstant();
        Instant startOfPrevMonth = zdt.minusMonths(1).withDayOfMonth(1).toLocalDate().atStartOfDay(ZoneOffset.UTC).toInstant();

        BigDecimal totalRevenue = sumRevenue(tenantId, Instant.EPOCH, now);
        BigDecimal todayRevenue = sumRevenue(tenantId, startOfDay, now);
        BigDecimal weekRevenue = sumRevenue(tenantId, startOfWeek, now);
        BigDecimal monthRevenue = sumRevenue(tenantId, startOfMonth, now);
        BigDecimal yearRevenue = sumRevenue(tenantId, startOfYear, now);
        BigDecimal prevMonthRevenue = sumRevenue(tenantId, startOfPrevMonth, startOfMonth);

        double monthOverMonth = 0.0;
        if (prevMonthRevenue.compareTo(BigDecimal.ZERO) > 0) {
            monthOverMonth = monthRevenue.subtract(prevMonthRevenue)
                    .divide(prevMonthRevenue, 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100))
                    .doubleValue();
        }

        return new RevenueSummaryResponse(totalRevenue, todayRevenue, weekRevenue, monthRevenue, yearRevenue, monthOverMonth);
    }

    private BigDecimal sumRevenue(String tenantId, Instant from, Instant to) {
        Aggregation agg = Aggregation.newAggregation(
                Aggregation.match(Criteria.where("tenantId").is(tenantId)
                        .and("eventType").is(EventType.ORDER_PLACED.name())
                        .and("timestamp").gte(from).lt(to)),
                Aggregation.project()
                        .andExpression("unitPrice * quantity").as("lineTotal"),
                Aggregation.group().sum("lineTotal").as("total")
        );

        var results = mongoTemplate.aggregate(agg, COLLECTION, Document.class);
        Document result = results.getUniqueMappedResult();
        if (result == null) return BigDecimal.ZERO;

        Object total = result.get("total");
        if (total instanceof Number n) {
            return BigDecimal.valueOf(n.doubleValue()).setScale(2, RoundingMode.HALF_UP);
        }
        return BigDecimal.ZERO;
    }

    public RevenueChartResponse getRevenueChart(String tenantId, String period) {
        Instant now = Instant.now();
        ZonedDateTime zdt = now.atZone(ZoneOffset.UTC);
        Instant from;
        String dateFormat;

        switch (period) {
            case "week" -> {
                from = zdt.minusDays(6).toLocalDate().atStartOfDay(ZoneOffset.UTC).toInstant();
                dateFormat = "%Y-%m-%d";
            }
            case "year" -> {
                from = zdt.minusMonths(11).withDayOfMonth(1).toLocalDate().atStartOfDay(ZoneOffset.UTC).toInstant();
                dateFormat = "%Y-%m";
            }
            default -> {
                from = zdt.minusDays(29).toLocalDate().atStartOfDay(ZoneOffset.UTC).toInstant();
                dateFormat = "%Y-%m-%d";
            }
        }

        Aggregation agg = Aggregation.newAggregation(
                Aggregation.match(Criteria.where("tenantId").is(tenantId)
                        .and("eventType").is(EventType.ORDER_PLACED.name())
                        .and("timestamp").gte(from)),
                Aggregation.project()
                        .andExpression("unitPrice * quantity").as("lineTotal")
                        .and(DateOperators.DateToString.dateOf("timestamp").toString(dateFormat)).as("dateBucket"),
                Aggregation.group("dateBucket").sum("lineTotal").as("revenue"),
                Aggregation.sort(Sort.Direction.ASC, "_id")
        );

        var results = mongoTemplate.aggregate(agg, COLLECTION, Document.class).getMappedResults();

        List<String> labels = new ArrayList<>();
        List<BigDecimal> values = new ArrayList<>();
        for (Document doc : results) {
            labels.add(doc.getString("_id"));
            Object rev = doc.get("revenue");
            values.add(rev instanceof Number n
                    ? BigDecimal.valueOf(n.doubleValue()).setScale(2, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO);
        }

        return new RevenueChartResponse(labels, values);
    }

    public OrderSummaryResponse getOrderSummary(String tenantId, String period) {
        long totalOrders = countDistinctOrders(tenantId, EventType.ORDER_PLACED);
        long fulfilledOrders = countDistinctOrders(tenantId, EventType.ORDER_FULFILLED);
        long unfulfilledOrders = totalOrders - fulfilledOrders;

        ZonedDateTime zdt = Instant.now().atZone(ZoneOffset.UTC);
        Instant from;
        String dateFormat;
        switch (period == null ? "month" : period) {
            case "week" -> {
                from = zdt.minusDays(6).toLocalDate().atStartOfDay(ZoneOffset.UTC).toInstant();
                dateFormat = "%Y-%m-%d";
            }
            case "year" -> {
                from = zdt.minusMonths(11).withDayOfMonth(1).toLocalDate().atStartOfDay(ZoneOffset.UTC).toInstant();
                dateFormat = "%Y-%m";
            }
            case "all" -> {
                from = Instant.EPOCH;
                dateFormat = "%Y-%m";
            }
            default -> {
                from = zdt.minusDays(29).toLocalDate().atStartOfDay(ZoneOffset.UTC).toInstant();
                dateFormat = "%Y-%m-%d";
            }
        }

        Aggregation trendAgg = Aggregation.newAggregation(
                Aggregation.match(Criteria.where("tenantId").is(tenantId)
                        .and("eventType").is(EventType.ORDER_PLACED.name())
                        .and("timestamp").gte(from)),
                Aggregation.group("orderId")
                        .first("timestamp").as("timestamp"),
                Aggregation.project()
                        .and(DateOperators.DateToString.dateOf("timestamp").toString(dateFormat)).as("day"),
                Aggregation.group("day").count().as("count"),
                Aggregation.sort(Sort.Direction.ASC, "_id")
        );

        var trendResults = mongoTemplate.aggregate(trendAgg, COLLECTION, Document.class).getMappedResults();
        List<String> trendLabels = new ArrayList<>();
        List<Long> trendValues = new ArrayList<>();
        for (Document doc : trendResults) {
            trendLabels.add(doc.getString("_id"));
            trendValues.add(doc.get("count", Number.class).longValue());
        }

        return new OrderSummaryResponse(totalOrders, fulfilledOrders, unfulfilledOrders, trendLabels, trendValues);
    }

    private long countDistinctOrders(String tenantId, EventType eventType) {
        Aggregation agg = Aggregation.newAggregation(
                Aggregation.match(Criteria.where("tenantId").is(tenantId)
                        .and("eventType").is(eventType.name())),
                Aggregation.group("orderId"),
                Aggregation.count().as("total")
        );
        Document result = mongoTemplate.aggregate(agg, COLLECTION, Document.class).getUniqueMappedResult();
        return result != null ? result.get("total", Number.class).longValue() : 0;
    }

    public List<TopProductResponse> getTopProducts(String tenantId, String sortBy, int limit) {
        String sortField = "units".equals(sortBy) ? "totalUnits" : "totalRevenue";

        Aggregation agg = Aggregation.newAggregation(
                Aggregation.match(Criteria.where("tenantId").is(tenantId)
                        .and("eventType").is(EventType.ORDER_PLACED.name())),
                Aggregation.group("productId")
                        .sum("quantity").as("totalUnits")
                        .sum(ArithmeticOperators.Multiply.valueOf("unitPrice").multiplyBy("quantity")).as("totalRevenue")
                        .first("productName").as("productName"),
                Aggregation.sort(Sort.Direction.DESC, sortField),
                Aggregation.limit(limit)
        );

        var results = mongoTemplate.aggregate(agg, COLLECTION, Document.class).getMappedResults();
        return results.stream().map(doc -> new TopProductResponse(
                doc.getString("_id"),
                doc.getString("productName"),
                doc.get("totalUnits", Number.class).longValue(),
                BigDecimal.valueOf(doc.get("totalRevenue", Number.class).doubleValue()).setScale(2, RoundingMode.HALF_UP)
        )).toList();
    }

    public List<ProductViewResponse> getProductViews(String tenantId) {
        Aggregation agg = Aggregation.newAggregation(
                Aggregation.match(Criteria.where("tenantId").is(tenantId)
                        .and("eventType").is(EventType.PRODUCT_VIEWED.name())),
                Aggregation.group("productId")
                        .count().as("viewCount")
                        .first("productName").as("productName"),
                Aggregation.sort(Sort.Direction.DESC, "viewCount"),
                Aggregation.limit(20)
        );

        var results = mongoTemplate.aggregate(agg, COLLECTION, Document.class).getMappedResults();
        return results.stream().map(doc -> new ProductViewResponse(
                doc.getString("_id"),
                doc.getString("productName"),
                doc.get("viewCount", Number.class).longValue()
        )).toList();
    }

    public List<SearchTermResponse> getSearchTerms() {
        Aggregation agg = Aggregation.newAggregation(
                Aggregation.match(Criteria.where("eventType").is(EventType.PRODUCT_SEARCHED.name())),
                Aggregation.group("searchTerm").count().as("count"),
                Aggregation.sort(Sort.Direction.DESC, "count"),
                Aggregation.limit(20)
        );

        var results = mongoTemplate.aggregate(agg, COLLECTION, Document.class).getMappedResults();
        return results.stream().map(doc -> new SearchTermResponse(
                doc.getString("_id"),
                doc.get("count", Number.class).longValue()
        )).toList();
    }
}
