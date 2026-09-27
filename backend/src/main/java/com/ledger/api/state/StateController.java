package com.ledger.api.state;

import com.ledger.api.security.CurrentUser;
import com.ledger.api.state.dto.PlannerStateDto;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/state")
public class StateController {

  private final StateService state;

  public StateController(StateService state) {
    this.state = state;
  }

  /** @return the user's full planner state, or 204 No Content when the user has no data yet. */
  @GetMapping
  public ResponseEntity<PlannerStateDto> get() {
    UUID userId = UUID.fromString(CurrentUser.id());
    return state.assemble(userId).map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.noContent().build());
  }

  /** Persist a full planner state. Returns the new settings.updated_at. */
  @PutMapping
  public Map<String, String> put(@RequestBody PlannerStateDto body) {
    UUID userId = UUID.fromString(CurrentUser.id());
    String updatedAt = state.persist(userId, body);
    return Map.of("updatedAt", updatedAt);
  }
}
