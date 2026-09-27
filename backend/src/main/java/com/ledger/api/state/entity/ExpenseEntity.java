package com.ledger.api.state.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.UUID;

/** public.expenses — client-generated TEXT id. */
@Entity
@Table(name = "expenses")
public class ExpenseEntity {
  @Id
  @Column(name = "id")
  public String id;

  @Column(name = "user_id")
  public UUID userId;

  @Column(name = "month_key")
  public String monthKey;

  @Column(name = "name")
  public String name;

  @Column(name = "category")
  public String category;

  @Column(name = "planned")
  public Double planned;

  @Column(name = "actual")
  public Double actual;

  @Column(name = "cur")
  public String cur;

  public ExpenseEntity() {}
}
