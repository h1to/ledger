package com.ledger.api.state.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import java.util.UUID;

/** public.rec_actuals — per-month override of a recurring payment's actual. */
@Entity
@Table(name = "rec_actuals")
@IdClass(RecActualId.class)
public class RecActualEntity {
  @Id
  @Column(name = "user_id")
  public UUID userId;

  @Id
  @Column(name = "month_key")
  public String monthKey;

  @Id
  @Column(name = "recurring_id")
  public String recurringId;

  @Column(name = "amount")
  public Double amount;

  public RecActualEntity() {}
}
