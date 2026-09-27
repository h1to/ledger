package com.ledger.api.advisor;

import com.anthropic.client.AnthropicClient;
import com.anthropic.client.okhttp.AnthropicOkHttpClient;
import com.anthropic.models.messages.MessageCreateParams;
import com.anthropic.models.messages.StructuredMessage;
import com.anthropic.models.messages.StructuredMessageCreateParams;
import com.anthropic.models.messages.ThinkingConfigAdaptive;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ledger.api.advisor.dto.AdvisorReport;
import com.ledger.api.advisor.dto.SnapshotRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

/**
 * Production {@link AdvisorModelClient}: calls {@code claude-sonnet-5} via the official Anthropic
 * Java SDK using a structured (JSON-schema) output derived from {@link AdvisorReport}. Adaptive
 * thinking is enabled. The system prompt forbids the model from inventing numbers — it may only
 * narrate the figures in the snapshot it is given.
 */
@Component
public class AnthropicAdvisorClient implements AdvisorModelClient {

  private final String apiKey;
  private final String model;
  private final ObjectMapper mapper;
  private volatile AnthropicClient client; // built lazily so a missing key doesn't break startup

  public AnthropicAdvisorClient(
      @Value("${app.anthropic.api-key:}") String apiKey,
      @Value("${app.anthropic.model:claude-sonnet-5}") String model,
      ObjectMapper mapper) {
    this.apiKey = apiKey;
    this.model = model;
    this.mapper = mapper;
  }

  private AnthropicClient client() {
    AnthropicClient c = client;
    if (c == null) {
      synchronized (this) {
        c = client;
        if (c == null) {
          if (apiKey == null || apiKey.isBlank()) {
            throw new ResponseStatusException(
                HttpStatus.SERVICE_UNAVAILABLE, "AI advisor not configured (ANTHROPIC_API_KEY)");
          }
          c = AnthropicOkHttpClient.builder().apiKey(apiKey).build();
          client = c;
        }
      }
    }
    return c;
  }

  @Override
  public AdvisorReport analyze(SnapshotRequest snapshot) {
    String snapshotJson = serialize(snapshot);
    String lang = snapshot.lang() != null ? snapshot.lang() : "en";

    StructuredMessageCreateParams<AdvisorReport> params =
        MessageCreateParams.builder()
            .model(model)
            .maxTokens(4096L)
            .system(buildSystemPrompt(lang))
            .thinking(ThinkingConfigAdaptive.builder().build())
            .outputConfig(AdvisorReport.class)
            .addUserMessage(buildUserMessage(snapshotJson))
            .build();

    StructuredMessage<AdvisorReport> resp = client().messages().create(params);
    return resp.content().stream()
        .flatMap(cb -> cb.text().stream())
        .map(t -> t.text())
        .findFirst()
        .orElseThrow(
            () ->
                new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY, "advisor model returned no structured content"));
  }

  private String serialize(SnapshotRequest snapshot) {
    try {
      return mapper.writeValueAsString(snapshot);
    } catch (JsonProcessingException e) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid snapshot", e);
    }
  }

  /** Package-visible for tests: the system prompt that pins the model to narration-only. */
  static String buildSystemPrompt(String lang) {
    String language = "ru".equalsIgnoreCase(lang) ? "Russian" : "English";
    return "You are a careful personal-finance advisor for a budgeting app.\n"
        + "You are given a de-identified snapshot of a person's finances: amounts, categories,"
        + " rates, dates and PRE-COMPUTED metrics.\n"
        + "STRICT RULES:\n"
        + "1. You MUST NOT invent, estimate, or recompute any number. Every figure you mention"
        + " must be copied verbatim from the snapshot. Do not perform arithmetic.\n"
        + "2. If a figure is not present in the snapshot, do not state it — say it is unknown or"
        + " omit it.\n"
        + "3. Rank actions by impact, explain trade-offs, and be concrete and encouraging.\n"
        + "4. Write all narrative text in "
        + language
        + ".\n"
        + "Return only the structured report.";
  }

  /** Package-visible for tests: wraps the snapshot JSON as the user turn. */
  static String buildUserMessage(String snapshotJson) {
    return "Here is the financial snapshot (JSON). Narrate and prioritize using ONLY these"
        + " figures:\n"
        + snapshotJson;
  }
}
