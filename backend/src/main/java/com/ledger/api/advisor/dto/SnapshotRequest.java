package com.ledger.api.advisor.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;

/**
 * A de-identified financial snapshot computed by the frontend. Contains amounts, categories, rates,
 * dates and pre-computed metrics only — NO identifiers (no names, IINs, contract or account
 * numbers, no bank names). The backend hashes this for caching and forwards the figures to the
 * model, which may only narrate them (never invent numbers).
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record SnapshotRequest(
    String lang, // "en" | "ru" — narrative language
    String baseCur, // currency all figures are expressed in
    String asOfMonth, // "YYYY-MM"
    Metrics metrics,
    List<Debt> debts,
    List<Goal> goals,
    Double totalDebt,
    String debtFreeMonth // projected, or null when unknown
    ) {

  @JsonInclude(JsonInclude.Include.NON_NULL)
  public record Metrics(
      Double monthlyIncome,
      Double monthlyEssentialSpend,
      Double savingsRate, // 0..1
      Double runwayMonths,
      Double fixedCostRatio, // 0..1
      Double netWorth) {}

  /** A single debt/loan, de-identified: {@code label} is a generic tag like "Loan 1". */
  @JsonInclude(JsonInclude.Include.NON_NULL)
  public record Debt(
      String label,
      Double balance,
      Double payment,
      Double rate, // annual %, or null when unknown
      Integer payoffMonths) {}

  /** A savings goal, de-identified: {@code label} is a generic tag like "Goal 1". */
  @JsonInclude(JsonInclude.Include.NON_NULL)
  public record Goal(
      String label,
      Double target,
      Double saved,
      String deadline, // "YYYY-MM" or null
      Double neededPerMonth) {}
}
