package com.ledger.api.state.entity;

import java.io.Serializable;
import java.util.Objects;
import java.util.UUID;

public class MonthId implements Serializable {
  public UUID userId;
  public String monthKey;

  public MonthId() {}

  public MonthId(UUID userId, String monthKey) {
    this.userId = userId;
    this.monthKey = monthKey;
  }

  @Override
  public boolean equals(Object o) {
    if (this == o) return true;
    if (!(o instanceof MonthId that)) return false;
    return Objects.equals(userId, that.userId) && Objects.equals(monthKey, that.monthKey);
  }

  @Override
  public int hashCode() {
    return Objects.hash(userId, monthKey);
  }
}
