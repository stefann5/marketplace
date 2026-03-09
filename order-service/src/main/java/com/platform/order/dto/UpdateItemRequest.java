package com.platform.order.dto;

import jakarta.validation.constraints.Positive;

public record UpdateItemRequest(@Positive int quantity) {}
