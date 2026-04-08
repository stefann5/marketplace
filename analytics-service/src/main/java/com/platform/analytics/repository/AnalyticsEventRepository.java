package com.platform.analytics.repository;

import com.platform.analytics.model.AnalyticsEvent;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface AnalyticsEventRepository extends MongoRepository<AnalyticsEvent, String> {
}
