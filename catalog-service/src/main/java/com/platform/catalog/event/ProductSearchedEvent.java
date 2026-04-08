package com.platform.catalog.event;

import java.time.Instant;
import java.util.List;

public record ProductSearchedEvent(
        String searchTerm,
        List<String> resultProductIds,
        int resultCount,
        Instant timestamp
) {}
