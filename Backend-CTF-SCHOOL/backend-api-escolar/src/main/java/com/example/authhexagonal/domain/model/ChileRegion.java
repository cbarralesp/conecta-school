package com.example.authhexagonal.domain.model;

import java.util.List;

public record ChileRegion(
        Long id,
        String code,
        String name,
        List<ChileCommune> communes
) {
}
