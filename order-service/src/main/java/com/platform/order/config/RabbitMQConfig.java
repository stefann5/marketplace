package com.platform.order.config;

import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    public static final String EXCHANGE = "analytics.exchange";
    public static final String ORDER_PLACED_KEY = "event.order.placed";
    public static final String ORDER_FULFILLED_KEY = "event.order.fulfilled";

    @Bean
    public TopicExchange analyticsExchange() {
        return new TopicExchange(EXCHANGE);
    }

    @Bean
    public Jackson2JsonMessageConverter messageConverter() {
        return new Jackson2JsonMessageConverter();
    }
}
