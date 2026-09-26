package com.ledger.api.state.entity;

import java.io.Serializable;
import java.util.Objects;
import java.util.UUID;

public class ContributionId implements Serializable {
  public UUID userId;
  public String goalId;
  public String monthKey;

  public ContributionId() {}

  public ContributionId(UUID userId, String goalId, String monthKey) {
    this.userId = userId;
    this.goalId = goalId;
    this.monthKey = monthKey;
  }

  @Override
  public boolean equals(Object o) {
    if (this == o) return true;
    if (!(o instanceof ContributionId that)) return false;
    return Objects.equals(userId, that.userId)
        && Objects.equals(goalId, that.goalId)
        && Objects.equals(monthKey, that.monthKey);
  }

  @Override
  public int hashCode() {
    return Objects.hash(userId, goalId, monthKey);
  }
}
