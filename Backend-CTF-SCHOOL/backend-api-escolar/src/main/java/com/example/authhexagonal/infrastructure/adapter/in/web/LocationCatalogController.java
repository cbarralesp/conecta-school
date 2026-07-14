package com.example.authhexagonal.infrastructure.adapter.in.web;

import com.example.authhexagonal.domain.port.in.GetLocationCatalogUseCase;
import com.example.authhexagonal.infrastructure.adapter.in.web.dto.ChileRegionResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping({"/api/catalogos/ubicaciones", "/api/catálogos/ubicaciones"})
public class LocationCatalogController {

    private final GetLocationCatalogUseCase getLocationCatalogUseCase;

    public LocationCatalogController(GetLocationCatalogUseCase getLocationCatalogUseCase) {
        this.getLocationCatalogUseCase = getLocationCatalogUseCase;
    }

    @GetMapping("/chile")
    public List<ChileRegionResponse> findChileRegions() {
        return getLocationCatalogUseCase.findChileRegions().stream()
                .map(ChileRegionResponse::fromDomain)
                .toList();
    }
}
