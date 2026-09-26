package com.ledger.api.auth;

import com.ledger.api.security.JwtService;
import com.ledger.api.user.UserEntity;
import com.ledger.api.user.UserRepository;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AuthService {

  private final UserRepository users;
  private final PasswordEncoder encoder;
  private final JwtService jwt;

  public AuthService(UserRepository users, PasswordEncoder encoder, JwtService jwt) {
    this.users = users;
    this.encoder = encoder;
    this.jwt = jwt;
  }

  /** Register a new user and return a signed JWT. */
  public String register(String email, String password) {
    String normalized = email.trim().toLowerCase();
    if (users.existsByEmailIgnoreCase(normalized)) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "email already registered");
    }
    UserEntity user = new UserEntity(UUID.randomUUID(), normalized, encoder.encode(password));
    users.save(user);
    return jwt.issue(user.getId().toString(), user.getEmail());
  }

  /** Verify credentials and return a signed JWT, or 401. */
  public String login(String email, String password) {
    String normalized = email.trim().toLowerCase();
    UserEntity user =
        users
            .findByEmailIgnoreCase(normalized)
            .orElseThrow(
                () -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "invalid credentials"));
    if (!encoder.matches(password, user.getPasswordHash())) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "invalid credentials");
    }
    return jwt.issue(user.getId().toString(), user.getEmail());
  }
}
