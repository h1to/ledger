package com.ledger.api.state.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;
import java.util.Map;

/** Mirrors types.ts Month. {@code closed}/{@code leftover} are omitted when unset (NON_NULL). */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record MonthDto(
    List<IncomeDto> incomes,
    List<ExpenseDto> expenses,
    Map<String, Double> recActuals,
    Boolean closed,
    Double leftover) {}
