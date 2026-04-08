package com.platform.catalog.event;

import com.platform.catalog.config.RabbitMQConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class EventPublisher {

    private final RabbitTemplate rabbitTemplate;

    public void publishProductViewed(ProductViewedEvent event) {
        try {
            rabbitTemplate.convertAndSend(RabbitMQConfig.EXCHANGE, RabbitMQConfig.PRODUCT_VIEWED_KEY, event);
        } catch (Exception e) {
            log.warn("Failed to publish PRODUCT_VIEWED event: {}", e.getMessage());
        }
    }

    public void publishProductSearched(ProductSearchedEvent event) {
        try {
            rabbitTemplate.convertAndSend(RabbitMQConfig.EXCHANGE, RabbitMQConfig.PRODUCT_SEARCHED_KEY, event);
        } catch (Exception e) {
            log.warn("Failed to publish PRODUCT_SEARCHED event: {}", e.getMessage());
        }
    }
}
