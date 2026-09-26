package com.ledger.api.state.entity;

import java.io.Serializable;
import java.util.Objects;
import java.util.UUID;

public class CurrencyRateId implements Serializable {
  public UUID userId;
  public String currency;

  public CurrencyRateId() {}

  public CurrencyRateId(UUID userId, String currency) {
    this.userId = userId;
    this.currency = currency;
  }

  @Override
  public boolean equals(Object o) {
    if (this == o) return true;
    if (!(o instanceof CurrencyRateId that)) return false;
    return Objects.equals(userId, that.userId) && Objects.equals(currency, that.currency);
  }

  @Override
  public int hashCode() {
    return Objects.hash(userId, currency);
  }
}
