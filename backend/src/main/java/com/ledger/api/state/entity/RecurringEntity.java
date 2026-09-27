package com.ledger.api.state.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.UUID;

/** public.recurring — recurring payments/income. */
@Entity
@Table(name = "recurring")
public class RecurringEntity {
  @Id
  @Column(name = "id")
  public String id;

  @Column(name = "user_id")
  public UUID userId;

  @Column(name = "name")
  public String name;

  @Column(name = "type")
  public String type;

  @Column(name = "category")
  public String category;

  @Column(name = "amount")
  public Double amount;

  @Column(name = "cur")
  public String cur;

  @Column(name = "start_key")
  public String startKey;

  @Column(name = "end_key")
  public String endKey;

  public RecurringEntity() {}
}
