package com.ledger.api.state.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import java.util.UUID;

/** public.contributions — goal contributions per month (FK to goals). */
@Entity
@Table(name = "contributions")
@IdClass(ContributionId.class)
public class ContributionEntity {
  @Id
  @Column(name = "user_id")
  public UUID userId;

  @Id
  @Column(name = "goal_id")
  public String goalId;

  @Id
  @Column(name = "month_key")
  public String monthKey;

  @Column(name = "amount")
  public Double amount;

  public ContributionEntity() {}
}
