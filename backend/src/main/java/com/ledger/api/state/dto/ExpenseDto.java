package com.ledger.api.state.dto;

/** Mirrors types.ts Expense. */
public record ExpenseDto(
    String id, String name, String category, Double planned, Double actual, String cur) {}
