package com.platform.analytics.model;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.List;

@Document(collection = "analytics_events")
@Getter
@Setter
@NoArgsConstructor
public class AnalyticsEvent {

    @Id
    private String id;
    private String tenantId;
    private EventType eventType;
    private String productId;
    private String productName;
    private String userId;
    private String orderId;
    private String searchTerm;
    private Integer quantity;
    private double unitPrice;
    private double orderTotal;
    private Long categoryId;
    private List<String> resultProductIds;
    private Instant timestamp;
}
