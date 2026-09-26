package com.ledger.api.state.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.UUID;

/** public.loans — fixed monthly payment, auto-counted as a monthly expense. */
@Entity
@Table(name = "loans")
public class LoanEntity {
  @Id
  @Column(name = "id")
  public String id;

  @Column(name = "user_id")
  public UUID userId;

  @Column(name = "name")
  public String name;

  @Column(name = "payment")
  public Double payment;

  @Column(name = "cur")
  public String cur;

  @Column(name = "start_key")
  public String startKey;

  @Column(name = "end_key")
  public String endKey;

  @Column(name = "rate")
  public Double rate;

  @Column(name = "overpayment")
  public Double overpayment;

  @Column(name = "bank")
  public String bank;

  @Column(name = "debt")
  public Double debt;

  @Column(name = "contract")
  public String contract;

  @Column(name = "kind")
  public String kind;

  @Column(name = "source")
  public String source;

  public LoanEntity() {}
}
