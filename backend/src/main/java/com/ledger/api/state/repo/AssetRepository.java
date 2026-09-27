package com.ledger.api.state.repo;

import com.ledger.api.state.entity.AssetEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AssetRepository extends JpaRepository<AssetEntity, String> {
  List<AssetEntity> findByUserId(UUID userId);

  @Modifying
  @Query("delete from AssetEntity e where e.userId = :userId")
  void deleteByUserId(@Param("userId") UUID userId);
}
