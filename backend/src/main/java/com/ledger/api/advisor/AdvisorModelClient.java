package com.ledger.api.advisor;

import com.ledger.api.advisor.dto.AdvisorReport;
import com.ledger.api.advisor.dto.SnapshotRequest;

/**
 * Abstraction over the LLM call so the advisor service can be tested with the model mocked. The
 * production implementation ({@link AnthropicAdvisorClient}) calls claude-sonnet-5 via the official
 * Anthropic Java SDK with a structured (JSON-schema) output.
 */
public interface AdvisorModelClient {
  AdvisorReport analyze(SnapshotRequest snapshot);
}
