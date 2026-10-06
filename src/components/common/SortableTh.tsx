import React from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import type { SortDirection } from '../../hooks/useDataTable';

export interface SortableThProps {
  children: React.ReactNode;
  field?: string;
  currentSortKey?: string | null;
  sortDirection?: SortDirection;
  onSort?: (field: string) => void;
  align?: 'right' | 'center' | 'left';
  className?: string;
  sortable?: boolean;
  title?: string;
}

export const SortableTh: React.FC<SortableThProps> = ({
  children,
  field,
  currentSortKey,
  sortDirection,
  onSort,
  align = 'center',
  className = '',
  sortable = true,
  title,
}) => {
  const isCurrent = Boolean(field && currentSortKey === field);
  const direction = isCurrent ? sortDirection : null;
  const canSort = sortable && Boolean(field && onSort);

  const handleClick = () => {
    if (canSort && field && onSort) {
      onSort(field);
    }
  };

  const alignClasses =
    align === 'right'
      ? 'justify-start text-right'
      : align === 'left'
      ? 'justify-end text-left'
      : 'justify-center text-center';

  return (
    <th
      scope="col"
      onClick={canSort ? handleClick : undefined}
      title={title || (canSort ? 'انقر للترتيب' : undefined)}
      className={`p-3 select-none text-xs font-extrabold transition-colors ${
        canSort ? 'cursor-pointer hover:bg-slate-100/90 group' : ''
      } ${
        isCurrent
          ? 'bg-emerald-50/80 text-emerald-950 font-black'
          : 'text-slate-700 font-extrabold'
      } ${className}`}
    >
      <div className={`inline-flex items-center gap-1.5 w-full ${alignClasses}`}>
        <span>{children}</span>
        {canSort && (
          <span
            className={`inline-flex items-center transition-transform duration-200 shrink-0 ${
              isCurrent
                ? 'text-emerald-700 opacity-100 scale-110'
                : 'text-slate-400 opacity-40 group-hover:opacity-100 group-hover:text-slate-600'
            }`}
          >
            {direction === 'asc' ? (
              <ArrowUp className="w-3.5 h-3.5 stroke-[2.5]" />
            ) : direction === 'desc' ? (
              <ArrowDown className="w-3.5 h-3.5 stroke-[2.5]" />
            ) : (
              <ArrowUpDown className="w-3 h-3 stroke-[2]" />
            )}
          </span>
        )}
      </div>
    </th>
  );
};

export default SortableTh;
