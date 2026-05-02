package com.example.authhexagonal.domain.port.out;

import com.example.authhexagonal.domain.model.ChileRegion;

import java.util.List;

public interface LocationCatalogRepository {
    List<ChileRegion> findChileRegions();
}
