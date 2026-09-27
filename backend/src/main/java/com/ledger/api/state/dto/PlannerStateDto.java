package com.ledger.api.state.dto;

import java.util.List;
import java.util.Map;

/**
 * The full planner state, mirroring react-app/src/types.ts PlannerState so the frontend consumes it
 * unchanged. {@code ratesUpdated} / {@code lastModified} keep their (possibly null) values like the
 * frontend's rowSetToState. {@code updatedAt} is an API-only addition (from settings.updated_at).
 */
public record PlannerStateDto(
    Integer year,
    String baseCur,
    Map<String, Double> rates,
    Long ratesUpdated,
    Map<String, MonthDto> months,
    List<RecurringDto> recurring,
    List<LoanDto> loans,
    List<GoalDto> goals,
    List<AssetDto> assets,
    Boolean tourDone,
    Long lastModified,
    String updatedAt) {}
