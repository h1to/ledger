package com.ledger.api;

import static org.assertj.core.api.Assertions.assertThat;

import com.ledger.api.state.dto.PlannerStateDto;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class AuthAndApiIntegrationTest extends AbstractPostgresTest {

  @Autowired TestRestTemplate rest;

  private static String uniqueEmail() {
    return "user-" + System.nanoTime() + "@example.com";
  }

  @SuppressWarnings("unchecked")
  private String registerAndGetToken(String email, String password) {
    ResponseEntity<Map> resp =
        rest.postForEntity("/auth/register", Map.of("email", email, "password", password), Map.class);
    assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);
    return (String) resp.getBody().get("token");
  }

  @Test
  void registerReturnsToken() {
    String token = registerAndGetToken(uniqueEmail(), "secret123");
    assertThat(token).isNotBlank();
  }

  @Test
  void registerRejectsShortPassword() {
    ResponseEntity<Map> resp =
        rest.postForEntity(
            "/auth/register", Map.of("email", uniqueEmail(), "password", "123"), Map.class);
    assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
  }

  @Test
  void registerRejectsDuplicateEmail() {
    String email = uniqueEmail();
    registerAndGetToken(email, "secret123");
    ResponseEntity<Map> resp =
        rest.postForEntity(
            "/auth/register", Map.of("email", email, "password", "secret123"), Map.class);
    assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
  }

  @Test
  void loginSucceedsAndWrongPasswordIs401() {
    String email = uniqueEmail();
    registerAndGetToken(email, "secret123");

    ResponseEntity<Map> ok =
        rest.postForEntity(
            "/auth/login", Map.of("email", email, "password", "secret123"), Map.class);
    assertThat(ok.getStatusCode()).isEqualTo(HttpStatus.OK);
    assertThat(ok.getBody().get("token")).isNotNull();

    ResponseEntity<Map> bad =
        rest.postForEntity("/auth/login", Map.of("email", email, "password", "nope"), Map.class);
    assertThat(bad.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
  }

  @Test
  void stateRequiresAuth() {
    ResponseEntity<String> resp = rest.getForEntity("/api/state", String.class);
    assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
  }

  @Test
  void stateRoundTripsOverHttp() {
    String token = registerAndGetToken(uniqueEmail(), "secret123");
    HttpHeaders headers = new HttpHeaders();
    headers.setBearerAuth(token);
    headers.setContentType(MediaType.APPLICATION_JSON);

    // No data yet -> 204.
    ResponseEntity<PlannerStateDto> empty =
        rest.exchange("/api/state", HttpMethod.GET, new HttpEntity<>(headers), PlannerStateDto.class);
    assertThat(empty.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);

    PlannerStateDto body =
        new PlannerStateDto(
            2026,
            "KZT",
            Map.of("USD", 540.0),
            null,
            Map.of(),
            List.of(),
            List.of(),
            List.of(),
            List.of(),
            false,
            42L,
            null);
    ResponseEntity<Map> put =
        rest.exchange("/api/state", HttpMethod.PUT, new HttpEntity<>(body, headers), Map.class);
    assertThat(put.getStatusCode()).isEqualTo(HttpStatus.OK);
    assertThat(put.getBody().get("updatedAt")).isNotNull();

    ResponseEntity<PlannerStateDto> got =
        rest.exchange("/api/state", HttpMethod.GET, new HttpEntity<>(headers), PlannerStateDto.class);
    assertThat(got.getStatusCode()).isEqualTo(HttpStatus.OK);
    assertThat(got.getBody().year()).isEqualTo(2026);
    assertThat(got.getBody().rates()).isEqualTo(Map.of("USD", 540.0));
    assertThat(got.getBody().lastModified()).isEqualTo(42L);
  }
}
