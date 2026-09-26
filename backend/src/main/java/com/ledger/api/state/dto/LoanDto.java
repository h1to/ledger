package com.ledger.api.state.dto;

/**
 * Mirrors types.ts Loan. rate/overpayment/bank/debt/contract/kind/source are present keys with
 * possibly-null values, matching the frontend's rowSetToState output.
 */
public record LoanDto(
    String id,
    String name,
    Double payment,
    String cur,
    String start,
    String end,
    Double rate,
    Double overpayment,
    String bank,
    Double debt,
    String contract,
    String kind,
    String source) {}
