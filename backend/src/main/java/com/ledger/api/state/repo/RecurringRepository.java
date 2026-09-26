package com.ledger.api.state.repo;

import com.ledger.api.state.entity.RecurringEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RecurringRepository extends JpaRepository<RecurringEntity, String> {
  List<RecurringEntity> findByUserId(UUID userId);

  @Modifying
  @Query("delete from RecurringEntity e where e.userId = :userId")
  void deleteByUserId(@Param("userId") UUID userId);
}
