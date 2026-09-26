package com.ledger.api.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/** Issues and verifies stateless HS256 JWTs. Subject = user id (uuid string). */
@Service
public class JwtService {

  private final SecretKey key;
  private final long ttlMillis;

  public JwtService(
      @Value("${app.jwt.secret}") String secret,
      @Value("${app.jwt.ttl-millis}") long ttlMillis) {
    byte[] bytes = secret.getBytes(StandardCharsets.UTF_8);
    // HS256 requires a key of at least 256 bits (32 bytes). Fail fast on a too-short secret.
    if (bytes.length < 32) {
      throw new IllegalStateException(
          "JWT_SECRET must be at least 32 bytes for HS256; got " + bytes.length);
    }
    this.key = Keys.hmacShaKeyFor(bytes);
    this.ttlMillis = ttlMillis;
  }

  public String issue(String userId, String email) {
    Date now = new Date();
    return Jwts.builder()
        .subject(userId)
        .claim("email", email)
        .issuedAt(now)
        .expiration(new Date(now.getTime() + ttlMillis))
        .signWith(key)
        .compact();
  }

  /** @return the user id (subject) if the token is valid, else throws. */
  public String verifyAndGetUserId(String token) {
    Claims claims = Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
    return claims.getSubject();
  }
}
