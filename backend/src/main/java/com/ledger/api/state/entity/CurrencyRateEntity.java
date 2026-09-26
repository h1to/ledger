package com.ledger.api.state.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import java.util.UUID;

/** public.currency_rates — 1 unit of currency = N base-currency units. PK (user_id, currency). */
@Entity
@Table(name = "currency_rates")
@IdClass(CurrencyRateId.class)
public class CurrencyRateEntity {
  @Id
  @Column(name = "user_id")
  public UUID userId;

  @Id
  @Column(name = "currency")
  public String currency;

  @Column(name = "rate")
  public Double rate;

  public CurrencyRateEntity() {}
}
