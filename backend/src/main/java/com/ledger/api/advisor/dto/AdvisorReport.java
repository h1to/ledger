package com.ledger.api.advisor.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import java.util.List;

/**
 * The structured advisor report. This POJO doubles as the JSON-schema contract for the model's
 * structured output. The {@code @JsonPropertyDescription}s become the schema field descriptions
 * that steer the model — every figure it cites must come from the snapshot it was given.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record AdvisorReport(
    @JsonPropertyDescription(
            "A 2-3 sentence plain-language read on the person's overall financial state, using only"
                + " figures from the provided snapshot.")
        String summary,
    @JsonPropertyDescription("Prioritized, high-impact actions ranked most important first.")
        List<Action> actions,
    @JsonPropertyDescription(
            "The recommended debt-payoff strategy (e.g. avalanche or snowball) and why, referencing"
                + " the snapshot's debts. Empty string if there are no debts.")
        String debtStrategy,
    @JsonPropertyDescription(
            "Emergency-fund and goal-pacing guidance, and the debt-vs-savings trade-off, using the"
                + " snapshot's runway, savings rate and goals.")
        String savingsGuidance,
    @JsonPropertyDescription("Short warnings about risks (e.g. high debt load, no emergency fund).")
        List<String> warnings,
    @JsonPropertyDescription("Short encouragements acknowledging real progress.")
        List<String> encouragements) {

  @JsonInclude(JsonInclude.Include.NON_NULL)
  public record Action(
      @JsonPropertyDescription("Short imperative title of the action.") String title,
      @JsonPropertyDescription("Why this matters, in one or two sentences.") String why,
      @JsonPropertyDescription(
              "The concrete figure this action refers to, copied from the snapshot (do not compute"
                  + " new numbers).")
          String figure,
      @JsonPropertyDescription(
              "The projected effect, expressed only in terms of figures present in the snapshot.")
          String projectedEffect) {}
}
