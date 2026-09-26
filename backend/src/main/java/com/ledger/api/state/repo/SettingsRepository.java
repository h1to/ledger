package com.ledger.api.state.repo;

import com.ledger.api.state.entity.SettingsEntity;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SettingsRepository extends JpaRepository<SettingsEntity, UUID> {}
