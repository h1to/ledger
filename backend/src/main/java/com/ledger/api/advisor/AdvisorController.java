package com.ledger.api.advisor;

import com.ledger.api.advisor.dto.AdvisorReport;
import com.ledger.api.advisor.dto.SnapshotRequest;
import com.ledger.api.security.CurrentUser;
import java.util.UUID;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/advisor")
public class AdvisorController {

  private final AdvisorService advisor;

  public AdvisorController(AdvisorService advisor) {
    this.advisor = advisor;
  }

  @PostMapping("/analyze")
  public AdvisorReport analyze(@RequestBody SnapshotRequest snapshot) {
    UUID userId = UUID.fromString(CurrentUser.id());
    return advisor.analyze(userId, snapshot);
  }
}
