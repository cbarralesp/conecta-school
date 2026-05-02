package com.example.authhexagonal.domain.port.in;

import com.example.authhexagonal.domain.model.ChileRegion;

import java.util.List;

public interface GetLocationCatalogUseCase {
    List<ChileRegion> findChileRegions();
}
