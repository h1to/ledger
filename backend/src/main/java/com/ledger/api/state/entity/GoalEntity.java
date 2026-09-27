package com.ledger.api.state.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.UUID;

/** public.goals. Contributions hang off goal_id. */
@Entity
@Table(name = "goals")
public class GoalEntity {
  @Id
  @Column(name = "id")
  public String id;

  @Column(name = "user_id")
  public UUID userId;

  @Column(name = "name")
  public String name;

  @Column(name = "target")
  public Double target;

  @Column(name = "deadline_key")
  public String deadlineKey;

  public GoalEntity() {}
}
