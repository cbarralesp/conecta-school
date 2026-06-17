package com.example.authhexagonal.domain.model;

import java.util.List;

public record PedagogicalReportContent(
        String documentTitle,
        String educatorName,
        List<PedagogicalReportArea> developmentAreas,
        PedagogicalReportArea attitudeArea,
        List<String> familyRecommendations,
        String teacherSignatureName,
        String guardianSignatureLabel
) {
}
