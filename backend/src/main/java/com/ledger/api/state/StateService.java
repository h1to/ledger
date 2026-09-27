package com.ledger.api.state;

import com.ledger.api.state.dto.AssetDto;
import com.ledger.api.state.dto.ExpenseDto;
import com.ledger.api.state.dto.GoalDto;
import com.ledger.api.state.dto.IncomeDto;
import com.ledger.api.state.dto.LoanDto;
import com.ledger.api.state.dto.MonthDto;
import com.ledger.api.state.dto.PlannerStateDto;
import com.ledger.api.state.dto.RecurringDto;
import com.ledger.api.state.entity.AssetEntity;
import com.ledger.api.state.entity.ContributionEntity;
import com.ledger.api.state.entity.CurrencyRateEntity;
import com.ledger.api.state.entity.ExpenseEntity;
import com.ledger.api.state.entity.GoalEntity;
import com.ledger.api.state.entity.IncomeEntity;
import com.ledger.api.state.entity.LoanEntity;
import com.ledger.api.state.entity.MonthEntity;
import com.ledger.api.state.entity.RecActualEntity;
import com.ledger.api.state.entity.RecurringEntity;
import com.ledger.api.state.entity.SettingsEntity;
import com.ledger.api.state.repo.AssetRepository;
import com.ledger.api.state.repo.ContributionRepository;
import com.ledger.api.state.repo.CurrencyRateRepository;
import com.ledger.api.state.repo.ExpenseRepository;
import com.ledger.api.state.repo.GoalRepository;
import com.ledger.api.state.repo.IncomeRepository;
import com.ledger.api.state.repo.LoanRepository;
import com.ledger.api.state.repo.MonthRepository;
import com.ledger.api.state.repo.RecActualRepository;
import com.ledger.api.state.repo.RecurringRepository;
import com.ledger.api.state.repo.SettingsRepository;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.TreeMap;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Assembles a {@link PlannerStateDto} from the 11 relational tables and persists a full state back,
 * scoped to one user. Faithfully ports react-app/src/lib/repo/mapper.ts (rowSetToState /
 * stateToRowSet) and store/cloud/relationalDriver.ts (parents-before-children on write,
 * children-before-parents on delete).
 */
@Service
public class StateService {

  private final SettingsRepository settingsRepo;
  private final CurrencyRateRepository ratesRepo;
  private final MonthRepository monthRepo;
  private final IncomeRepository incomeRepo;
  private final ExpenseRepository expenseRepo;
  private final RecActualRepository recActualRepo;
  private final RecurringRepository recurringRepo;
  private final LoanRepository loanRepo;
  private final GoalRepository goalRepo;
  private final ContributionRepository contributionRepo;
  private final AssetRepository assetRepo;

  public StateService(
      SettingsRepository settingsRepo,
      CurrencyRateRepository ratesRepo,
      MonthRepository monthRepo,
      IncomeRepository incomeRepo,
      ExpenseRepository expenseRepo,
      RecActualRepository recActualRepo,
      RecurringRepository recurringRepo,
      LoanRepository loanRepo,
      GoalRepository goalRepo,
      ContributionRepository contributionRepo,
      AssetRepository assetRepo) {
    this.settingsRepo = settingsRepo;
    this.ratesRepo = ratesRepo;
    this.monthRepo = monthRepo;
    this.incomeRepo = incomeRepo;
    this.expenseRepo = expenseRepo;
    this.recActualRepo = recActualRepo;
    this.recurringRepo = recurringRepo;
    this.loanRepo = loanRepo;
    this.goalRepo = goalRepo;
    this.contributionRepo = contributionRepo;
    this.assetRepo = assetRepo;
  }

  private static String s(String v, String def) {
    return v == null ? def : v;
  }

  private static double d(Double v) {
    return v == null ? 0.0 : v;
  }

  // -------------------------------------------------------------------------
  // Assemble (GET /api/state)
  // -------------------------------------------------------------------------

  /**
   * @return the assembled state, or empty if the user has no data at all (mirrors
   *     relationalDriver.load() returning null when nothing exists).
   */
  @Transactional(readOnly = true)
  public Optional<PlannerStateDto> assemble(UUID userId) {
    Optional<SettingsEntity> settingsOpt = settingsRepo.findById(userId);
    List<CurrencyRateEntity> rateRows = ratesRepo.findByUserId(userId);
    List<MonthEntity> monthRows = monthRepo.findByUserId(userId);
    List<IncomeEntity> incomeRows = incomeRepo.findByUserId(userId);
    List<ExpenseEntity> expenseRows = expenseRepo.findByUserId(userId);
    List<RecActualEntity> recActualRows = recActualRepo.findByUserId(userId);
    List<RecurringEntity> recurringRows = recurringRepo.findByUserId(userId);
    List<LoanEntity> loanRows = loanRepo.findByUserId(userId);
    List<GoalEntity> goalRows = goalRepo.findByUserId(userId);
    List<ContributionEntity> contribRows = contributionRepo.findByUserId(userId);
    List<AssetEntity> assetRows = assetRepo.findByUserId(userId);

    boolean any =
        settingsOpt.isPresent()
            || !rateRows.isEmpty()
            || !monthRows.isEmpty()
            || !incomeRows.isEmpty()
            || !expenseRows.isEmpty()
            || !recActualRows.isEmpty()
            || !recurringRows.isEmpty()
            || !loanRows.isEmpty()
            || !goalRows.isEmpty()
            || !contribRows.isEmpty()
            || !assetRows.isEmpty();
    if (!any) {
      return Optional.empty();
    }

    // ----- settings -----
    Integer year;
    String baseCur;
    Long ratesUpdated;
    Boolean tourDone;
    Long lastModified;
    String updatedAt;
    if (settingsOpt.isPresent()) {
      SettingsEntity st = settingsOpt.get();
      year = st.year != null ? st.year : OffsetDateTime.now(ZoneOffset.UTC).getYear();
      baseCur = s(st.baseCur, "KZT");
      ratesUpdated = st.ratesUpdated;
      tourDone = Boolean.TRUE.equals(st.tourDone);
      lastModified = st.lastModified;
      updatedAt = st.updatedAt != null ? st.updatedAt.toString() : null;
    } else {
      year = OffsetDateTime.now(ZoneOffset.UTC).getYear();
      baseCur = "KZT";
      ratesUpdated = null;
      tourDone = false;
      lastModified = null;
      updatedAt = null;
    }

    // ----- rates (currency -> rate) -----
    Map<String, Double> rates = new TreeMap<>();
    for (CurrencyRateEntity r : rateRows) {
      rates.put(r.currency, d(r.rate));
    }

    // ----- months (build, then attach children; ensure a month exists per child) -----
    // Sort month keys for a deterministic map order (JSON key order is not significant to the
    // client, which canonicalizes before comparing, but determinism keeps round-trips stable).
    Map<String, MutableMonth> months = new TreeMap<>();
    for (MonthEntity m : monthRows) {
      MutableMonth mm = new MutableMonth();
      mm.closed = Boolean.TRUE.equals(m.closed) ? Boolean.TRUE : null;
      mm.leftover = m.leftover;
      months.put(m.monthKey, mm);
    }
    // incomes / expenses: sorted by id (matches mapper.ts rowSetToState sort()).
    incomeRows.sort(Comparator.comparing(e -> e.id));
    for (IncomeEntity i : incomeRows) {
      ensure(months, i.monthKey)
          .incomes
          .add(new IncomeDto(i.id, s(i.name, ""), d(i.amount), i.cur));
    }
    expenseRows.sort(Comparator.comparing(e -> e.id));
    for (ExpenseEntity e : expenseRows) {
      ensure(months, e.monthKey)
          .expenses
          .add(
              new ExpenseDto(
                  e.id, s(e.name, ""), s(e.category, "Other"), d(e.planned), d(e.actual), e.cur));
    }
    for (RecActualEntity ra : recActualRows) {
      ensure(months, ra.monthKey).recActuals.put(ra.recurringId, d(ra.amount));
    }

    Map<String, MonthDto> monthDtos = new LinkedHashMap<>();
    for (Map.Entry<String, MutableMonth> en : months.entrySet()) {
      MutableMonth mm = en.getValue();
      monthDtos.put(
          en.getKey(),
          new MonthDto(mm.incomes, mm.expenses, mm.recActuals, mm.closed, mm.leftover));
    }

    // ----- recurring (sorted by id) -----
    recurringRows.sort(Comparator.comparing(r -> r.id));
    List<RecurringDto> recurring = new ArrayList<>();
    for (RecurringEntity r : recurringRows) {
      recurring.add(
          new RecurringDto(
              r.id,
              s(r.name, ""),
              r.type,
              s(r.category, "Other"),
              d(r.amount),
              r.cur,
              r.startKey,
              r.endKey));
    }

    // ----- loans (sorted by id) -----
    loanRows.sort(Comparator.comparing(l -> l.id));
    List<LoanDto> loans = new ArrayList<>();
    for (LoanEntity l : loanRows) {
      loans.add(
          new LoanDto(
              l.id,
              s(l.name, ""),
              d(l.payment),
              l.cur,
              l.startKey,
              l.endKey,
              l.rate,
              l.overpayment,
              l.bank,
              l.debt,
              l.contract,
              l.kind,
              "import".equals(l.source) ? "import" : "manual"));
    }

    // ----- goals (sorted by id) + contributions -----
    goalRows.sort(Comparator.comparing(g -> g.id));
    Map<String, Map<String, Double>> contribsByGoal = new LinkedHashMap<>();
    for (ContributionEntity c : contribRows) {
      contribsByGoal.computeIfAbsent(c.goalId, k -> new TreeMap<>()).put(c.monthKey, d(c.amount));
    }
    List<GoalDto> goals = new ArrayList<>();
    for (GoalEntity g : goalRows) {
      Map<String, Double> contribs = contribsByGoal.getOrDefault(g.id, new TreeMap<>());
      goals.add(new GoalDto(g.id, s(g.name, ""), d(g.target), g.deadlineKey, contribs));
    }

    // ----- assets (sorted by id) -----
    assetRows.sort(Comparator.comparing(a -> a.id));
    List<AssetDto> assets = new ArrayList<>();
    for (AssetEntity a : assetRows) {
      Boolean liquid = a.liquid == null ? Boolean.TRUE : a.liquid;
      assets.add(new AssetDto(a.id, s(a.name, ""), a.kind, d(a.value), a.cur, liquid));
    }

    return Optional.of(
        new PlannerStateDto(
            year,
            baseCur,
            rates,
            ratesUpdated,
            monthDtos,
            recurring,
            loans,
            goals,
            assets,
            tourDone,
            lastModified,
            updatedAt));
  }

  private static MutableMonth ensure(Map<String, MutableMonth> months, String monthKey) {
    return months.computeIfAbsent(monthKey, k -> new MutableMonth());
  }

  private static final class MutableMonth {
    final List<IncomeDto> incomes = new ArrayList<>();
    final List<ExpenseDto> expenses = new ArrayList<>();
    final Map<String, Double> recActuals = new TreeMap<>();
    Boolean closed;
    Double leftover;
  }

  // -------------------------------------------------------------------------
  // Persist (PUT /api/state)
  // -------------------------------------------------------------------------

  /**
   * Persist a full state transactionally: delete every existing row for the user (children before
   * parents), then insert the new rows (parents before children). This is the "correctness over
   * cleverness" full reconcile the spec allows, and it reproduces the ordering constraints of
   * relationalDriver.ts (the only real FK being contributions -> goals).
   */
  @Transactional
  public String persist(UUID userId, PlannerStateDto state) {
    // ---- deletes: children before parents ----
    recActualRepo.deleteByUserId(userId);
    contributionRepo.deleteByUserId(userId);
    incomeRepo.deleteByUserId(userId);
    expenseRepo.deleteByUserId(userId);
    monthRepo.deleteByUserId(userId);
    recurringRepo.deleteByUserId(userId);
    loanRepo.deleteByUserId(userId);
    goalRepo.deleteByUserId(userId);
    assetRepo.deleteByUserId(userId);
    ratesRepo.deleteByUserId(userId);
    settingsRepo.deleteById(userId);
    // Flush the deletes before re-inserting so PK/unique collisions can't occur within the txn.
    flushDeletes();

    OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);

    // ---- inserts: parents before children ----
    // settings
    SettingsEntity st = new SettingsEntity();
    st.userId = userId;
    st.year = state.year() != null ? state.year() : now.getYear();
    st.baseCur = s(state.baseCur(), "KZT");
    st.ratesUpdated = state.ratesUpdated();
    st.tourDone = Boolean.TRUE.equals(state.tourDone());
    st.lastModified = state.lastModified();
    st.updatedAt = now;
    settingsRepo.save(st);

    // currency_rates
    if (state.rates() != null) {
      List<CurrencyRateEntity> rows = new ArrayList<>();
      for (Map.Entry<String, Double> en : state.rates().entrySet()) {
        CurrencyRateEntity r = new CurrencyRateEntity();
        r.userId = userId;
        r.currency = en.getKey();
        r.rate = en.getValue();
        rows.add(r);
      }
      ratesRepo.saveAll(rows);
    }

    // months
    Map<String, MonthDto> months = state.months() != null ? state.months() : Map.of();
    List<MonthEntity> monthEntities = new ArrayList<>();
    for (Map.Entry<String, MonthDto> en : months.entrySet()) {
      MonthDto m = en.getValue();
      MonthEntity me = new MonthEntity();
      me.userId = userId;
      me.monthKey = en.getKey();
      me.closed = Boolean.TRUE.equals(m.closed());
      me.leftover = m.leftover();
      monthEntities.add(me);
    }
    monthRepo.saveAll(monthEntities);

    // recurring
    if (state.recurring() != null) {
      List<RecurringEntity> rows = new ArrayList<>();
      for (RecurringDto r : state.recurring()) {
        RecurringEntity e = new RecurringEntity();
        e.id = r.id();
        e.userId = userId;
        e.name = s(r.name(), "");
        e.type = r.type();
        e.category = s(r.category(), "Other");
        e.amount = r.amount();
        e.cur = r.cur();
        e.startKey = r.start();
        e.endKey = r.end();
        rows.add(e);
      }
      recurringRepo.saveAll(rows);
    }

    // loans
    if (state.loans() != null) {
      List<LoanEntity> rows = new ArrayList<>();
      for (LoanDto l : state.loans()) {
        LoanEntity e = new LoanEntity();
        e.id = l.id();
        e.userId = userId;
        e.name = s(l.name(), "");
        e.payment = l.payment();
        e.cur = l.cur();
        e.startKey = l.start();
        e.endKey = l.end();
        e.rate = l.rate();
        e.overpayment = l.overpayment();
        e.bank = l.bank();
        e.debt = l.debt();
        e.contract = l.contract();
        e.kind = l.kind();
        e.source = s(l.source(), "manual");
        rows.add(e);
      }
      loanRepo.saveAll(rows);
    }

    // goals (before contributions)
    if (state.goals() != null) {
      List<GoalEntity> rows = new ArrayList<>();
      for (GoalDto g : state.goals()) {
        GoalEntity e = new GoalEntity();
        e.id = g.id();
        e.userId = userId;
        e.name = s(g.name(), "");
        e.target = g.target();
        e.deadlineKey = g.deadline();
        rows.add(e);
      }
      goalRepo.saveAll(rows);
    }

    // assets
    if (state.assets() != null) {
      List<AssetEntity> rows = new ArrayList<>();
      for (AssetDto a : state.assets()) {
        AssetEntity e = new AssetEntity();
        e.id = a.id();
        e.userId = userId;
        e.name = s(a.name(), "");
        e.kind = a.kind();
        e.value = a.value();
        e.cur = a.cur();
        e.liquid = a.liquid() == null ? Boolean.TRUE : a.liquid();
        rows.add(e);
      }
      assetRepo.saveAll(rows);
    }

    // month children: incomes, expenses, rec_actuals
    List<IncomeEntity> incomes = new ArrayList<>();
    List<ExpenseEntity> expenses = new ArrayList<>();
    List<RecActualEntity> recActuals = new ArrayList<>();
    for (Map.Entry<String, MonthDto> en : months.entrySet()) {
      String mk = en.getKey();
      MonthDto m = en.getValue();
      if (m.incomes() != null) {
        for (IncomeDto i : m.incomes()) {
          IncomeEntity e = new IncomeEntity();
          e.id = i.id();
          e.userId = userId;
          e.monthKey = mk;
          e.name = s(i.name(), "");
          e.amount = i.amount();
          e.cur = i.cur();
          incomes.add(e);
        }
      }
      if (m.expenses() != null) {
        for (ExpenseDto x : m.expenses()) {
          ExpenseEntity e = new ExpenseEntity();
          e.id = x.id();
          e.userId = userId;
          e.monthKey = mk;
          e.name = s(x.name(), "");
          e.category = s(x.category(), "Other");
          e.planned = x.planned();
          e.actual = x.actual();
          e.cur = x.cur();
          expenses.add(e);
        }
      }
      if (m.recActuals() != null) {
        for (Map.Entry<String, Double> ra : m.recActuals().entrySet()) {
          RecActualEntity e = new RecActualEntity();
          e.userId = userId;
          e.monthKey = mk;
          e.recurringId = ra.getKey();
          e.amount = ra.getValue();
          recActuals.add(e);
        }
      }
    }
    incomeRepo.saveAll(incomes);
    expenseRepo.saveAll(expenses);
    recActualRepo.saveAll(recActuals);

    // contributions (after goals)
    List<ContributionEntity> contributions = new ArrayList<>();
    if (state.goals() != null) {
      for (GoalDto g : state.goals()) {
        if (g.contribs() == null) {
          continue;
        }
        for (Map.Entry<String, Double> c : g.contribs().entrySet()) {
          ContributionEntity e = new ContributionEntity();
          e.userId = userId;
          e.goalId = g.id();
          e.monthKey = c.getKey();
          e.amount = c.getValue();
          contributions.add(e);
        }
      }
    }
    contributionRepo.saveAll(contributions);

    return now.toString();
  }

  private void flushDeletes() {
    // saveAndFlush on any repo flushes the persistence context; use settingsRepo as the anchor.
    settingsRepo.flush();
  }
}
