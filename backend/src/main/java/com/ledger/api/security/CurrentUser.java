package com.ledger.api.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

/** Helper to read the authenticated user id (a uuid string) from the security context. */
public final class CurrentUser {
  private CurrentUser() {}

  public static String id() {
    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    if (auth == null || auth.getPrincipal() == null || !(auth.getPrincipal() instanceof String)) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not authenticated");
    }
    return (String) auth.getPrincipal();
  }
}
