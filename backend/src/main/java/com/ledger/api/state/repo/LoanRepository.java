package com.ledger.api.state.repo;

import com.ledger.api.state.entity.LoanEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface LoanRepository extends JpaRepository<LoanEntity, String> {
  List<LoanEntity> findByUserId(UUID userId);

  @Modifying
  @Query("delete from LoanEntity e where e.userId = :userId")
  void deleteByUserId(@Param("userId") UUID userId);
}
