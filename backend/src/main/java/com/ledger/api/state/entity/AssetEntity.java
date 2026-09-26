package com.ledger.api.state.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.UUID;

/** public.assets — assets & liabilities. */
@Entity
@Table(name = "assets")
public class AssetEntity {
  @Id
  @Column(name = "id")
  public String id;

  @Column(name = "user_id")
  public UUID userId;

  @Column(name = "name")
  public String name;

  @Column(name = "kind")
  public String kind;

  @Column(name = "value")
  public Double value;

  @Column(name = "cur")
  public String cur;

  @Column(name = "liquid")
  public Boolean liquid;

  public AssetEntity() {}
}
