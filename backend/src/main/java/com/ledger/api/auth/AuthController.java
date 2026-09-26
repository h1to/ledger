package com.ledger.api.auth;

import com.ledger.api.auth.dto.LoginRequest;
import com.ledger.api.auth.dto.RegisterRequest;
import com.ledger.api.auth.dto.TokenResponse;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/auth")
public class AuthController {

  private final AuthService auth;

  public AuthController(AuthService auth) {
    this.auth = auth;
  }

  @PostMapping("/register")
  public TokenResponse register(@Valid @RequestBody RegisterRequest req) {
    return new TokenResponse(auth.register(req.email(), req.password()));
  }

  @PostMapping("/login")
  public TokenResponse login(@Valid @RequestBody LoginRequest req) {
    return new TokenResponse(auth.login(req.email(), req.password()));
  }
}
