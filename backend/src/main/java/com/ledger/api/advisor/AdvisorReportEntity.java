package com.ledger.api.advisor;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** public.advisor_reports — cache of generated reports + backing for the per-day rate limit. */
@Entity
@Table(name = "advisor_reports")
public class AdvisorReportEntity {

  @Id
  @Column(name = "id")
  public UUID id;

  @Column(name = "user_id", nullable = false)
  public UUID userId;

  @Column(name = "created_at", nullable = false)
  public OffsetDateTime createdAt;

  @Column(name = "snapshot_hash", nullable = false)
  public String snapshotHash;

  /** The serialized {@link com.ledger.api.advisor.dto.AdvisorReport} as jsonb. */
  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "report_json", nullable = false, columnDefinition = "jsonb")
  public String reportJson;

  public AdvisorReportEntity() {}
}
