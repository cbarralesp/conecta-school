package com.example.authhexagonal.infrastructure.adapter.out.persistence;

import com.example.authhexagonal.domain.model.ChileCommune;
import com.example.authhexagonal.domain.model.ChileRegion;
import com.example.authhexagonal.domain.port.out.LocationCatalogRepository;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class LocationCatalogJdbcAdapter implements LocationCatalogRepository {

    private final JdbcTemplate jdbcTemplate;

    public LocationCatalogJdbcAdapter(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public List<ChileRegion> findChileRegions() {
        return jdbcTemplate.query("""
                SELECT "ID", "CODIGO", "NOMBRE"
                FROM "CHILE_REGIONES"
                ORDER BY "ID"
                """, (rs, rowNum) -> new ChileRegion(
                rs.getLong("ID"),
                rs.getString("CODIGO"),
                rs.getString("NOMBRE"),
                findCommunesByRegionId(rs.getLong("ID"))
        ));
    }

    private List<ChileCommune> findCommunesByRegionId(Long regionId) {
        return jdbcTemplate.query("""
                SELECT "ID", "NOMBRE"
                FROM "CHILE_COMUNAS"
                WHERE "REGION_ID" = ?
                ORDER BY "NOMBRE"
                """, (rs, rowNum) -> new ChileCommune(
                rs.getLong("ID"),
                rs.getString("NOMBRE")
        ), regionId);
    }
}
