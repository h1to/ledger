package com.ledger.api.state.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.UUID;

/** public.incomes — client-generated TEXT id. */
@Entity
@Table(name = "incomes")
public class IncomeEntity {
  @Id
  @Column(name = "id")
  public String id;

  @Column(name = "user_id")
  public UUID userId;

  @Column(name = "month_key")
  public String monthKey;

  @Column(name = "name")
  public String name;

  @Column(name = "amount")
  public Double amount;

  @Column(name = "cur")
  public String cur;

  public IncomeEntity() {}
}
