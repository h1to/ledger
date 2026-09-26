package com.ledger.api.common;

import java.util.HashMap;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

/** Turns exceptions into small, consistent JSON error bodies. */
@RestControllerAdvice
public class ApiExceptionHandler {

  @ExceptionHandler(ResponseStatusException.class)
  public ResponseEntity<Map<String, Object>> handleStatus(ResponseStatusException ex) {
    return ResponseEntity.status(ex.getStatusCode())
        .body(body(ex.getStatusCode().value(), ex.getReason()));
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException ex) {
    String msg =
        ex.getBindingResult().getFieldErrors().stream()
            .map(fe -> fe.getField() + ": " + fe.getDefaultMessage())
            .findFirst()
            .orElse("validation failed");
    return ResponseEntity.badRequest().body(body(HttpStatus.BAD_REQUEST.value(), msg));
  }

  private Map<String, Object> body(int status, String message) {
    Map<String, Object> m = new HashMap<>();
    m.put("status", status);
    m.put("error", message);
    return m;
  }
}
