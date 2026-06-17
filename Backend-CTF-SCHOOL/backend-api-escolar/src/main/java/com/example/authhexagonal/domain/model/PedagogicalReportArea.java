package com.example.authhexagonal.domain.model;

import java.util.List;

public record PedagogicalReportArea(
        String key,
        String title,
        String icon,
        String accentColor,
        String iconColor,
        List<PedagogicalReportItem> items,
        String observation
) {
}
