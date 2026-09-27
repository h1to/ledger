package com.ledger.api.advisor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.ledger.api.AbstractPostgresTest;
import com.ledger.api.advisor.dto.AdvisorReport;
import com.ledger.api.advisor.dto.SnapshotRequest;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.web.server.ResponseStatusException;

@SpringBootTest
class AdvisorServiceTest extends AbstractPostgresTest {

  @Autowired AdvisorService advisor;
  @Autowired AdvisorReportRepository reports;
  @MockBean AdvisorModelClient model;

  private static AdvisorReport sampleReport() {
    return new AdvisorReport(
        "You are doing well.",
        List.of(new AdvisorReport.Action("Pay off Loan 1", "Highest rate", "18%", "debt-free sooner")),
        "avalanche",
        "build 3-month runway",
        List.of("debt load high"),
        List.of("good savings rate"));
  }

  private static SnapshotRequest snapshot(String month) {
    return new SnapshotRequest(
        "en",
        "KZT",
        month,
        new SnapshotRequest.Metrics(500000.0, 300000.0, 0.2, 2.0, 0.4, 8000000.0),
        List.of(new SnapshotRequest.Debt("Loan 1", 300000.0, 80000.0, 18.0, 4)),
        List.of(new SnapshotRequest.Goal("Goal 1", 5000000.0, 150000.0, "2027-06", 300000.0)),
        300000.0,
        "2027-01");
  }

  @BeforeEach
  void reset() {
    reports.deleteAll();
    Mockito.reset(model);
    when(model.analyze(any())).thenReturn(sampleReport());
  }

  @Test
  void identicalSnapshotIsCachedAndModelCalledOnce() {
    UUID user = UUID.randomUUID();
    SnapshotRequest snap = snapshot("2026-08");

    AdvisorReport first = advisor.analyze(user, snap);
    AdvisorReport second = advisor.analyze(user, snap);

    assertThat(first).isEqualTo(sampleReport());
    assertThat(second).isEqualTo(first);
    verify(model, times(1)).analyze(any()); // second call served from cache
    assertThat(reports.count()).isEqualTo(1);
  }

  @Test
  void rateLimitBlocksTheEleventhDistinctSnapshot() {
    UUID user = UUID.randomUUID();
    for (int m = 1; m <= 10; m++) {
      advisor.analyze(user, snapshot(String.format("2026-%02d", m)));
    }
    verify(model, times(10)).analyze(any());

    assertThatThrownBy(() -> advisor.analyze(user, snapshot("2026-11")))
        .isInstanceOf(ResponseStatusException.class)
        .hasMessageContaining("daily advisor limit");
    // Model was not called an 11th time.
    verify(model, times(10)).analyze(any());
  }

  @Test
  void rateLimitIsPerUser() {
    UUID a = UUID.randomUUID();
    UUID b = UUID.randomUUID();
    for (int m = 1; m <= 10; m++) {
      advisor.analyze(a, snapshot(String.format("2026-%02d", m)));
    }
    // A different user is unaffected.
    AdvisorReport r = advisor.analyze(b, snapshot("2026-01"));
    assertThat(r).isEqualTo(sampleReport());
  }

  @Test
  void hashIsDeterministicAndSnapshotSensitive() {
    assertThat(advisor.hash(snapshot("2026-08"))).isEqualTo(advisor.hash(snapshot("2026-08")));
    assertThat(advisor.hash(snapshot("2026-08"))).isNotEqualTo(advisor.hash(snapshot("2026-09")));
  }
}
