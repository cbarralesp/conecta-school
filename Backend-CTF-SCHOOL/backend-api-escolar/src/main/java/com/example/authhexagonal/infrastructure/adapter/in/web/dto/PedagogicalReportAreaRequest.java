package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import java.util.List;

public record PedagogicalReportAreaRequest(
        String key,
        String title,
        String icon,
        String accentColor,
        String iconColor,
        List<PedagogicalReportItemRequest> items,
        String observation
) {
}
