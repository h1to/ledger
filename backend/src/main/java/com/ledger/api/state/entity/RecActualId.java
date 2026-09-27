package com.ledger.api.state.entity;

import java.io.Serializable;
import java.util.Objects;
import java.util.UUID;

public class RecActualId implements Serializable {
  public UUID userId;
  public String monthKey;
  public String recurringId;

  public RecActualId() {}

  public RecActualId(UUID userId, String monthKey, String recurringId) {
    this.userId = userId;
    this.monthKey = monthKey;
    this.recurringId = recurringId;
  }

  @Override
  public boolean equals(Object o) {
    if (this == o) return true;
    if (!(o instanceof RecActualId that)) return false;
    return Objects.equals(userId, that.userId)
        && Objects.equals(monthKey, that.monthKey)
        && Objects.equals(recurringId, that.recurringId);
  }

  @Override
  public int hashCode() {
    return Objects.hash(userId, monthKey, recurringId);
  }
}
