package com.ledger.api.state.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;

/** public.settings — one row per user (the singletons). */
@Entity
@Table(name = "settings")
public class SettingsEntity {
  @Id
  @Column(name = "user_id")
  public UUID userId;

  @Column(name = "year")
  public Integer year;

  @Column(name = "base_cur")
  public String baseCur;

  @Column(name = "rates_updated")
  public Long ratesUpdated;

  @Column(name = "tour_done")
  public Boolean tourDone;

  @Column(name = "last_modified")
  public Long lastModified;

  @Column(name = "updated_at")
  public OffsetDateTime updatedAt;

  public SettingsEntity() {}
}
