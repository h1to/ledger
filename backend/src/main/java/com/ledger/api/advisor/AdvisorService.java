package com.ledger.api.advisor;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.ledger.api.advisor.dto.AdvisorReport;
import com.ledger.api.advisor.dto.SnapshotRequest;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.HexFormat;
import java.util.Optional;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/**
 * Orchestrates an advisor analysis: cache by snapshot hash, enforce a per-day rate limit, and only
 * then call the model. The {@code advisor_reports} table backs both the cache and the rate limit.
 */
@Service
public class AdvisorService {

  private final AdvisorModelClient model;
  private final AdvisorReportRepository reports;
  private final ObjectMapper canonicalMapper;
  private final int dailyLimit;

  public AdvisorService(
      AdvisorModelClient model,
      AdvisorReportRepository reports,
      ObjectMapper mapper,
      @Value("${app.advisor.daily-limit:10}") int dailyLimit) {
    this.model = model;
    this.reports = reports;
    // A canonical mapper: deterministic key order so equal snapshots hash identically.
    this.canonicalMapper =
        mapper.copy().enable(SerializationFeature.ORDER_MAP_ENTRIES_BY_KEYS);
    this.dailyLimit = dailyLimit;
  }

  public AdvisorReport analyze(UUID userId, SnapshotRequest snapshot) {
    String hash = hash(snapshot);

    // 1) cache hit — free, does not consume the rate limit.
    Optional<AdvisorReportEntity> cached =
        reports.findFirstByUserIdAndSnapshotHashOrderByCreatedAtDesc(userId, hash);
    if (cached.isPresent()) {
      return deserialize(cached.get().reportJson);
    }

    // 2) rate limit (per UTC day).
    OffsetDateTime startOfDay =
        OffsetDateTime.now(ZoneOffset.UTC).toLocalDate().atStartOfDay().atOffset(ZoneOffset.UTC);
    long todayCount = reports.countByUserIdAndCreatedAtAfter(userId, startOfDay);
    if (todayCount >= dailyLimit) {
      throw new ResponseStatusException(
          HttpStatus.TOO_MANY_REQUESTS,
          "daily advisor limit reached (" + dailyLimit + " per day)");
    }

    // 3) call the model and cache the result.
    AdvisorReport report = model.analyze(snapshot);

    AdvisorReportEntity entity = new AdvisorReportEntity();
    entity.id = UUID.randomUUID();
    entity.userId = userId;
    entity.createdAt = OffsetDateTime.now(ZoneOffset.UTC);
    entity.snapshotHash = hash;
    entity.reportJson = serialize(report);
    reports.save(entity);

    return report;
  }

  /** SHA-256 over canonical (key-sorted) JSON of the snapshot. Package-visible for tests. */
  String hash(SnapshotRequest snapshot) {
    try {
      byte[] json = canonicalMapper.writeValueAsBytes(snapshot);
      MessageDigest md = MessageDigest.getInstance("SHA-256");
      return HexFormat.of().formatHex(md.digest(json));
    } catch (JsonProcessingException | NoSuchAlgorithmException e) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid snapshot", e);
    }
  }

  private String serialize(AdvisorReport report) {
    try {
      return canonicalMapper.writeValueAsString(report);
    } catch (JsonProcessingException e) {
      throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "cannot serialize report", e);
    }
  }

  private AdvisorReport deserialize(String json) {
    try {
      return canonicalMapper.readValue(json, AdvisorReport.class);
    } catch (JsonProcessingException e) {
      throw new ResponseStatusException(
          HttpStatus.INTERNAL_SERVER_ERROR, "corrupt cached report", e);
    }
  }
}
