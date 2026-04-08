package com.platform.order.event;

import com.platform.order.config.RabbitMQConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class EventPublisher {

    private final RabbitTemplate rabbitTemplate;

    public void publishOrderPlaced(OrderPlacedEvent event) {
        try {
            rabbitTemplate.convertAndSend(RabbitMQConfig.EXCHANGE, RabbitMQConfig.ORDER_PLACED_KEY, event);
        } catch (Exception e) {
            log.warn("Failed to publish ORDER_PLACED event: {}", e.getMessage());
        }
    }

    public void publishOrderFulfilled(OrderFulfilledEvent event) {
        try {
            rabbitTemplate.convertAndSend(RabbitMQConfig.EXCHANGE, RabbitMQConfig.ORDER_FULFILLED_KEY, event);
        } catch (Exception e) {
            log.warn("Failed to publish ORDER_FULFILLED event: {}", e.getMessage());
        }
    }
}
