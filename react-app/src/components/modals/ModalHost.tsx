import { useStore } from '../../store/useStore';
import { AssetModal } from './AssetModal';
import { IncomeModal } from './IncomeModal';
import { ExpenseModal } from './ExpenseModal';
import { RecurringModal } from './RecurringModal';
import { GoalModal } from './GoalModal';
import { ContribModal } from './ContribModal';
import { GoalDetail } from './GoalDetail';
import { CloseMonthModal } from './CloseMonthModal';
import { RatesModal } from './RatesModal';
import { ImportModal } from './ImportModal';
import { FeedbackModal } from './FeedbackModal';
import { SettingsModal } from './SettingsModal';
import { MoreSheet } from './MoreSheet';

export function ModalHost() {
  const modal = useStore((s) => s.modal);
  if (!modal) return null;
  switch (modal.type) {
    case 'asset':
      return <AssetModal id={modal.id} />;
    case 'income':
      return <IncomeModal k={modal.k} />;
    case 'expense':
      return <ExpenseModal k={modal.k} />;
    case 'recurring':
      return <RecurringModal id={modal.id} />;
    case 'goal':
      return <GoalModal id={modal.id} />;
    case 'contrib':
      return <ContribModal goalId={modal.goalId} />;
    case 'goalDetail':
      return <GoalDetail goalId={modal.goalId} />;
    case 'closeMonth':
      return <CloseMonthModal k={modal.k} />;
    case 'rates':
      return <RatesModal />;
    case 'import':
      return <ImportModal />;
    case 'feedback':
      return <FeedbackModal />;
    case 'settings':
      return <SettingsModal />;
    case 'more':
      return <MoreSheet />;
  }
}
