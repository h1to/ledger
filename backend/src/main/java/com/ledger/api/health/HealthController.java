package com.ledger.api.health;

import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/** Lightweight liveness endpoint for Render (Actuator health is also exposed at /actuator/health). */
@RestController
public class HealthController {

  @GetMapping("/health")
  public Map<String, String> health() {
    return Map.of("status", "ok");
  }
}
