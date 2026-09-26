package com.ledger.api.advisor;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

/**
 * Pure unit test (no Spring, no network) of request shaping: the system prompt must forbid inventing
 * numbers and honor the language, and the user message must carry the snapshot figures.
 */
class AnthropicAdvisorClientPromptTest {

  @Test
  void systemPromptForbidsInventingNumbers() {
    String en = AnthropicAdvisorClient.buildSystemPrompt("en");
    assertThat(en).contains("MUST NOT invent");
    assertThat(en).contains("Do not perform arithmetic");
    assertThat(en).contains("English");
  }

  @Test
  void systemPromptHonorsRussian() {
    assertThat(AnthropicAdvisorClient.buildSystemPrompt("ru")).contains("Russian");
  }

  @Test
  void userMessageCarriesTheSnapshot() {
    String msg = AnthropicAdvisorClient.buildUserMessage("{\"totalDebt\":300000}");
    assertThat(msg).contains("{\"totalDebt\":300000}");
    assertThat(msg).contains("ONLY these");
  }
}
