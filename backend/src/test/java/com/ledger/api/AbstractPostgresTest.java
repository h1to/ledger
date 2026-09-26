package com.ledger.api;

import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;

/**
 * Base class for integration tests. Boots a single shared Postgres container (reused across test
 * classes for speed), pre-creates the 11 planner tables via base-schema.sql, and points Spring at
 * it. Flyway then baselines and applies the new-table migrations. Requires a running Docker daemon.
 */
public abstract class AbstractPostgresTest {

  static final PostgreSQLContainer<?> POSTGRES;

  static {
    POSTGRES =
        new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("ledger")
            .withUsername("ledger")
            .withPassword("ledger")
            // Pre-create the existing planner tables before the app + Flyway start.
            .withInitScript("db/base-schema.sql");
    POSTGRES.start();
  }

  @DynamicPropertySource
  static void datasourceProps(DynamicPropertyRegistry registry) {
    registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
    registry.add("spring.datasource.username", POSTGRES::getUsername);
    registry.add("spring.datasource.password", POSTGRES::getPassword);
    // Deterministic advisor limit for the rate-limit test.
    registry.add("app.advisor.daily-limit", () -> "10");
    registry.add("app.jwt.secret", () -> "test-secret-that-is-at-least-32-bytes-long-000");
  }
}
