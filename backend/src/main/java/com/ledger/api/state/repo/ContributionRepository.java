package com.ledger.api.state.repo;

import com.ledger.api.state.entity.ContributionEntity;
import com.ledger.api.state.entity.ContributionId;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ContributionRepository
    extends JpaRepository<ContributionEntity, ContributionId> {
  List<ContributionEntity> findByUserId(UUID userId);

  @Modifying
  @Query("delete from ContributionEntity e where e.userId = :userId")
  void deleteByUserId(@Param("userId") UUID userId);
}
