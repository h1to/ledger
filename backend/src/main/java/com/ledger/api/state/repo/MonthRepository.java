package com.ledger.api.state.repo;

import com.ledger.api.state.entity.MonthEntity;
import com.ledger.api.state.entity.MonthId;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MonthRepository extends JpaRepository<MonthEntity, MonthId> {
  List<MonthEntity> findByUserId(UUID userId);

  @Modifying
  @Query("delete from MonthEntity e where e.userId = :userId")
  void deleteByUserId(@Param("userId") UUID userId);
}
