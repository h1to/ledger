package com.ledger.api.state.dto;

/** Mirrors types.ts Recurring. {@code end} may be null (present key, null value). */
public record RecurringDto(
    String id,
    String name,
    String type,
    String category,
    Double amount,
    String cur,
    String start,
    String end) {}
