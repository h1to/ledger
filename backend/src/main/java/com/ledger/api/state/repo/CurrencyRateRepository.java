package com.ledger.api.state.repo;

import com.ledger.api.state.entity.CurrencyRateEntity;
import com.ledger.api.state.entity.CurrencyRateId;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CurrencyRateRepository
    extends JpaRepository<CurrencyRateEntity, CurrencyRateId> {
  List<CurrencyRateEntity> findByUserId(UUID userId);

  @Modifying
  @Query("delete from CurrencyRateEntity e where e.userId = :userId")
  void deleteByUserId(@Param("userId") UUID userId);
}
