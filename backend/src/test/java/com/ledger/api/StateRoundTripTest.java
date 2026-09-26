package com.ledger.api;

import static org.assertj.core.api.Assertions.assertThat;

import com.ledger.api.state.StateService;
import com.ledger.api.state.dto.AssetDto;
import com.ledger.api.state.dto.ExpenseDto;
import com.ledger.api.state.dto.GoalDto;
import com.ledger.api.state.dto.IncomeDto;
import com.ledger.api.state.dto.LoanDto;
import com.ledger.api.state.dto.MonthDto;
import com.ledger.api.state.dto.PlannerStateDto;
import com.ledger.api.state.dto.RecurringDto;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

/**
 * Mirrors the frontend mapper round-trip test (mapper.test.ts): a rich state, persisted and read
 * back, must equal the original. Exercises multi-currency, closed/open months, recActuals,
 * contributions, loans, and deterministic ordering.
 */
@SpringBootTest
class StateRoundTripTest extends AbstractPostgresTest {

  @Autowired StateService state;

  private static PlannerStateDto rich() {
    Map<String, MonthDto> months = new LinkedHashMap<>();
    months.put(
        "2026-05",
        new MonthDto(
            List.of(),
            List.of(new ExpenseDto("e2", "Old", "Other", 50000.0, 60000.0, "KZT")),
            Map.of(),
            true,
            40000.0));
    months.put(
        "2026-08",
        new MonthDto(
            List.of(new IncomeDto("i1", "Freelance", 500.0, "USD")),
            List.of(new ExpenseDto("e1", "Food", "Groceries", 150000.0, 120000.0, "KZT")),
            Map.of("r1", 210000.0),
            null,
            null));
    months.put("2026-09", new MonthDto(List.of(), List.of(), Map.of(), null, null)); // empty survives

    List<RecurringDto> recurring =
        List.of(
            new RecurringDto("r1", "Rent", "expense", "Housing", 200000.0, "KZT", "2026-01", null),
            new RecurringDto("r2", "Salary", "income", "Income", 2000.0, "USD", "2026-01", "2026-12"));

    List<LoanDto> loans =
        List.of(
            new LoanDto(
                "l1", "Car loan", 80000.0, "KZT", "2026-01", "2027-12", 18.0, 300000.0, null, null,
                null, null, "manual"));

    List<GoalDto> goals =
        List.of(
            new GoalDto(
                "g1", "Apartment", 5000000.0, "2027-06", Map.of("2026-07", 100000.0, "2026-08", 50000.0)),
            new GoalDto("g2", "Trip", 300000.0, null, Map.of()));

    List<AssetDto> assets =
        List.of(
            new AssetDto("a1", "Deposit", "asset", 1000000.0, "KZT", true),
            new AssetDto("a2", "Apartment", "asset", 5000000.0, "KZT", false),
            new AssetDto("a3", "Loan", "liability", 300.0, "USD", true));

    Map<String, Double> rates = new LinkedHashMap<>();
    rates.put("USD", 540.0);
    rates.put("EUR", 590.0);

    return new PlannerStateDto(
        2026, "KZT", rates, 1700000000000L, months, recurring, loans, goals, assets, true, 1234L,
        null);
  }

  @Test
  void richStateRoundTrips() {
    UUID user = UUID.randomUUID();
    PlannerStateDto input = rich();

    state.persist(user, input);
    Optional<PlannerStateDto> readOpt = state.assemble(user);

    assertThat(readOpt).isPresent();
    PlannerStateDto out = readOpt.get();

    // updatedAt is server-set on persist, so compare everything else.
    assertThat(out.year()).isEqualTo(input.year());
    assertThat(out.baseCur()).isEqualTo(input.baseCur());
    assertThat(out.rates()).isEqualTo(input.rates());
    assertThat(out.ratesUpdated()).isEqualTo(input.ratesUpdated());
    assertThat(out.tourDone()).isEqualTo(input.tourDone());
    assertThat(out.lastModified()).isEqualTo(input.lastModified());
    assertThat(out.recurring()).isEqualTo(input.recurring());
    assertThat(out.loans()).isEqualTo(input.loans());
    assertThat(out.goals()).isEqualTo(input.goals());
    assertThat(out.assets()).isEqualTo(input.assets());
    assertThat(out.months()).isEqualTo(input.months());
    assertThat(out.updatedAt()).isNotNull(); // server stamped it
  }

  @Test
  void emptyUserAssemblesToEmpty() {
    assertThat(state.assemble(UUID.randomUUID())).isEmpty();
  }

  @Test
  void persistIsIdempotentAndDeletesRemovedRows() {
    UUID user = UUID.randomUUID();
    state.persist(user, rich());

    // Remove an asset and a goal, then persist again — the removed rows must be gone.
    PlannerStateDto reduced = rich();
    List<AssetDto> fewerAssets =
        reduced.assets().stream().filter(a -> !a.id().equals("a2")).toList();
    List<GoalDto> fewerGoals = reduced.goals().stream().filter(g -> !g.id().equals("g2")).toList();
    PlannerStateDto next =
        new PlannerStateDto(
            reduced.year(),
            reduced.baseCur(),
            reduced.rates(),
            reduced.ratesUpdated(),
            reduced.months(),
            reduced.recurring(),
            reduced.loans(),
            fewerGoals,
            fewerAssets,
            reduced.tourDone(),
            reduced.lastModified(),
            null);
    state.persist(user, next);

    PlannerStateDto out = state.assemble(user).orElseThrow();
    assertThat(out.assets()).extracting(AssetDto::id).containsExactly("a1", "a3");
    assertThat(out.goals()).extracting(GoalDto::id).containsExactly("g1");
  }
}
