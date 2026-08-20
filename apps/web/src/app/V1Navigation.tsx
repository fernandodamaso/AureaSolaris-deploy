import { Star } from 'lucide-react';
import { NavItem } from '../components/common/UIComponents';

export type V1Page = 'astrologia';

export function resolveV1Page(value: unknown): V1Page {
  if (value === 'astrologia') return value;
  return 'astrologia';
}

export function V1Navigation({
  currentPage,
  onNavigate,
  collapsed,
}: {
  currentPage: V1Page;
  onNavigate: (page: V1Page) => void;
  collapsed: boolean;
}) {
  return (
    <nav aria-label="Navegação V1" className="flex-1 space-y-1.5 px-4 overflow-y-auto no-scrollbar pb-6 pt-4">
      <NavItem
        icon={<Star size={18} />}
        label="Astrologia"
        active={currentPage === 'astrologia'}
        onClick={() => onNavigate('astrologia')}
        collapsed={collapsed}
      />
    </nav>
  );
}
