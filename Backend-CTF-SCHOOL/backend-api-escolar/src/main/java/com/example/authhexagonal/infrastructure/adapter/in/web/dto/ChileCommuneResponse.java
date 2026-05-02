package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import com.example.authhexagonal.domain.model.ChileCommune;

public record ChileCommuneResponse(
        Long id,
        String name
) {
    public static ChileCommuneResponse fromDomain(ChileCommune commune) {
        return new ChileCommuneResponse(commune.id(), commune.name());
    }
}
