package com.example.authhexagonal.infrastructure.adapter.in.web.dto;

import java.util.List;

public record PedagogicalReportContentRequest(
        String documentTitle,
        String educatorName,
        List<PedagogicalReportAreaRequest> developmentAreas,
        PedagogicalReportAreaRequest attitudeArea,
        List<String> familyRecommendations,
        String teacherSignatureName,
        String guardianSignatureLabel
) {
}
