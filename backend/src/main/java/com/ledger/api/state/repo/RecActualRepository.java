package com.ledger.api.state.repo;

import com.ledger.api.state.entity.RecActualEntity;
import com.ledger.api.state.entity.RecActualId;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RecActualRepository extends JpaRepository<RecActualEntity, RecActualId> {
  List<RecActualEntity> findByUserId(UUID userId);

  @Modifying
  @Query("delete from RecActualEntity e where e.userId = :userId")
  void deleteByUserId(@Param("userId") UUID userId);
}
