package com.ledger.api.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Reads a Bearer JWT, validates it, and sets an Authentication whose principal is the user id.
 * Controllers pull the current user via {@link CurrentUser}.
 */
@Component
public class JwtAuthFilter extends OncePerRequestFilter {

  private final JwtService jwtService;

  public JwtAuthFilter(JwtService jwtService) {
    this.jwtService = jwtService;
  }

  @Override
  protected void doFilterInternal(
      @NonNull HttpServletRequest request,
      @NonNull HttpServletResponse response,
      @NonNull FilterChain chain)
      throws ServletException, IOException {
    String header = request.getHeader("Authorization");
    if (header != null && header.startsWith("Bearer ")) {
      String token = header.substring(7);
      try {
        String userId = jwtService.verifyAndGetUserId(token);
        if (userId != null && SecurityContextHolder.getContext().getAuthentication() == null) {
          var auth =
              new UsernamePasswordAuthenticationToken(
                  userId, null, List.of()); // authenticated, no roles needed
          auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
          SecurityContextHolder.getContext().setAuthentication(auth);
        }
      } catch (Exception ignored) {
        // Invalid/expired token: leave the context unauthenticated; protected routes return 401.
      }
    }
    chain.doFilter(request, response);
  }
}
