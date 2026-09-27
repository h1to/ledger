package com.ledger.api.state.dto;

/** Mirrors types.ts Asset. {@code liquid} is always present (defaults true in the mapper). */
public record AssetDto(
    String id, String name, String kind, Double value, String cur, Boolean liquid) {}
