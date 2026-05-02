package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import com.example.authhexagonal.domain.model.ChileRegion;

import java.util.List;

public record ChileRegionResponse(
        Long id,
        String code,
        String name,
        List<ChileCommuneResponse> communes
) {
    public static ChileRegionResponse fromDomain(ChileRegion region) {
        return new ChileRegionResponse(
                region.id(),
                region.code(),
                region.name(),
                region.communes().stream().map(ChileCommuneResponse::fromDomain).toList()
        );
    }
}
