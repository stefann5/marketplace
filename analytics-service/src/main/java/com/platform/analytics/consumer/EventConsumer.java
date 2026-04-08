package com.platform.analytics.consumer;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.platform.analytics.config.RabbitMQConfig;
import com.platform.analytics.model.AnalyticsEvent;
import com.platform.analytics.model.EventType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.ArrayList;

@Component
@RequiredArgsConstructor
@Slf4j
public class EventConsumer {

    private final MongoTemplate mongoTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());

    @RabbitListener(queues = RabbitMQConfig.QUEUE)
    public void handleEvent(Message message) {
        try {
            String routingKey = message.getMessageProperties().getReceivedRoutingKey();
            JsonNode json = objectMapper.readTree(message.getBody());

            switch (routingKey) {
                case "event.product.viewed" -> handleProductViewed(json);
                case "event.product.searched" -> handleProductSearched(json);
                case "event.order.placed" -> handleOrderPlaced(json);
                case "event.order.fulfilled" -> handleOrderFulfilled(json);
                default -> log.warn("Unknown routing key: {}", routingKey);
            }
        } catch (Exception e) {
            log.error("Failed to process event: {}", e.getMessage(), e);
        }
    }

    private void handleProductViewed(JsonNode json) {
        AnalyticsEvent event = new AnalyticsEvent();
        event.setEventType(EventType.PRODUCT_VIEWED);
        event.setTenantId(json.get("tenantId").asText());
        event.setProductId(json.get("productId").asText());
        event.setProductName(json.get("productName").asText());
        if (json.has("categoryId") && !json.get("categoryId").isNull()) {
            event.setCategoryId(json.get("categoryId").asLong());
        }
        event.setTimestamp(Instant.now());
        mongoTemplate.save(event);
    }

    private void handleProductSearched(JsonNode json) {
        AnalyticsEvent event = new AnalyticsEvent();
        event.setEventType(EventType.PRODUCT_SEARCHED);
        event.setSearchTerm(json.get("searchTerm").asText());
        var ids = new ArrayList<String>();
        json.get("resultProductIds").forEach(n -> ids.add(n.asText()));
        event.setResultProductIds(ids);
        event.setTimestamp(Instant.now());
        mongoTemplate.save(event);
    }

    private void handleOrderPlaced(JsonNode json) {
        String tenantId = json.get("tenantId").asText();
        String orderId = json.get("orderId").asText();
        String userId = json.get("userId").asText();
        double total = json.get("total").asDouble();
        Instant now = Instant.now();

        JsonNode items = json.get("items");
        if (items != null && items.isArray()) {
            for (JsonNode item : items) {
                AnalyticsEvent event = new AnalyticsEvent();
                event.setEventType(EventType.ORDER_PLACED);
                event.setTenantId(tenantId);
                event.setOrderId(orderId);
                event.setUserId(userId);
                event.setOrderTotal(total);
                event.setProductId(item.get("productId").asText());
                event.setQuantity(item.get("quantity").asInt());
                event.setUnitPrice(item.get("unitPrice").asDouble());
                if (item.has("categoryId") && !item.get("categoryId").isNull()) {
                    event.setCategoryId(item.get("categoryId").asLong());
                }
                event.setTimestamp(now);
                mongoTemplate.save(event);
            }
        }
    }

    private void handleOrderFulfilled(JsonNode json) {
        AnalyticsEvent event = new AnalyticsEvent();
        event.setEventType(EventType.ORDER_FULFILLED);
        event.setTenantId(json.get("tenantId").asText());
        event.setOrderId(json.get("orderId").asText());
        event.setTimestamp(Instant.now());
        mongoTemplate.save(event);
    }
}
