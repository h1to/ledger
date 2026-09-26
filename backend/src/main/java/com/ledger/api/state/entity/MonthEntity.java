package com.ledger.api.state.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import java.util.UUID;

/** public.months — keyed by "YYYY-MM". PK (user_id, month_key). */
@Entity
@Table(name = "months")
@IdClass(MonthId.class)
public class MonthEntity {
  @Id
  @Column(name = "user_id")
  public UUID userId;

  @Id
  @Column(name = "month_key")
  public String monthKey;

  @Column(name = "closed")
  public Boolean closed;

  @Column(name = "leftover")
  public Double leftover;

  public MonthEntity() {}
}
