package com.ledger.api.advisor;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AdvisorReportRepository extends JpaRepository<AdvisorReportEntity, UUID> {

  /** Cache lookup: the most recent report for this user + snapshot hash. */
  Optional<AdvisorReportEntity> findFirstByUserIdAndSnapshotHashOrderByCreatedAtDesc(
      UUID userId, String snapshotHash);

  /** Rate-limit backing: how many reports this user has generated since a cutoff. */
  long countByUserIdAndCreatedAtAfter(UUID userId, OffsetDateTime cutoff);
}
