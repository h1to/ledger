package com.ledger.api.state.dto;

import java.util.Map;

/** Mirrors types.ts Goal. {@code deadline} may be null. {@code contribs}: monthKey -> KZT amount. */
public record GoalDto(
    String id, String name, Double target, String deadline, Map<String, Double> contribs) {}
