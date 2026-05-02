package com.example.authhexagonal.application.service;

import com.example.authhexagonal.domain.model.ChileRegion;
import com.example.authhexagonal.domain.port.in.GetLocationCatalogUseCase;
import com.example.authhexagonal.domain.port.out.LocationCatalogRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class LocationCatalogService implements GetLocationCatalogUseCase {

    private final LocationCatalogRepository locationCatalogRepository;

    public LocationCatalogService(LocationCatalogRepository locationCatalogRepository) {
        this.locationCatalogRepository = locationCatalogRepository;
    }

    @Override
    public List<ChileRegion> findChileRegions() {
        return locationCatalogRepository.findChileRegions();
    }
}
