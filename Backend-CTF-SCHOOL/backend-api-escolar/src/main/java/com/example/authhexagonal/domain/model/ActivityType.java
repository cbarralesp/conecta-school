package com.example.authhexagonal.domain.model;

public record ActivityType(
        Long id,
        String code,
        String name,
        String description,
        String backgroundColor,
        String textColor,
        String icon
) {
}
