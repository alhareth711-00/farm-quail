import React, { useState, useMemo, useCallback } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

export type SortDirection = 'asc' | 'desc' | null;

export interface SortConfig<T = any> {
  key: string | null;
  direction: SortDirection;
  getter?: (item: T) => any;
}

export interface UseDataTableOptions<T = any> {
  initialKey?: string | null;
  initialDirection?: SortDirection;
  getters?: Record<string, (item: T) => any>;
  searchQuery?: string;
  searchFields?: (keyof T | ((item: T) => any))[];
}

/**
 * دالة عامة لمقارنة وترتيب القيم بمختلف أنواعها (نصوص عربية/إنجليزية، أرقام، تواريخ، قيم فارغة)
 */
export function compareValues(a: any, b: any, direction: 'asc' | 'desc' = 'asc'): number {
  // التعامل مع القيم الفارغة والـ undefined بحيث تظهر دائماً في نهاية الترتيب
  if (a === null || a === undefined) return direction === 'asc' ? 1 : -1;
  if (b === null || b === undefined) return direction === 'asc' ? -1 : 1;

  // في حالة تساوي القيمتين تماماً
  if (a === b) return 0;

  let comparison = 0;

  // 1. مقارنة الأرقام
  if (typeof a === 'number' && typeof b === 'number') {
    comparison = a - b;
  }
  // 2. مقارنة التواريخ (كائنات Date أو سلاسل نصية تمثل تاريخاً مثل YYYY-MM-DD)
  else if (
    (a instanceof Date || (typeof a === 'string' && /^\d{4}-\d{2}-\d{2}/.test(a))) &&
    (b instanceof Date || (typeof b === 'string' && /^\d{4}-\d{2}-\d{2}/.test(b)))
  ) {
    const timeA = new Date(a).getTime();
    const timeB = new Date(b).getTime();
    if (!isNaN(timeA) && !isNaN(timeB)) {
      comparison = timeA - timeB;
    } else {
      comparison = String(a).localeCompare(String(b), 'ar', { numeric: true, sensitivity: 'base' });
    }
  }
  // 3. مقارنة النصوص باللغة العربية والإنجليزية مع دعم الأرقام داخل النصوص (Natural Sort)
  else if (typeof a === 'string' || typeof b === 'string') {
    comparison = String(a).localeCompare(String(b), 'ar', {
      numeric: true,
      sensitivity: 'base',
    });
  }
  // 4. مقارنة القيم المنطقية (Booleans)
  else if (typeof a === 'boolean' && typeof b === 'boolean') {
    comparison = a === b ? 0 : a ? 1 : -1;
  }
  // 5. الحالة الافتراضية
  else {
    comparison = a > b ? 1 : a < b ? -1 : 0;
  }

  return direction === 'asc' ? comparison : -comparison;
}

/**
 * دالة عامة لترتيب أي مصفوفة بيانات بسهولة
 */
export function sortData<T>(
  data: T[],
  key: string | null,
  direction: SortDirection,
  customGetter?: (item: T) => any
): T[] {
  if (!data || !Array.isArray(data) || !key || !direction) {
    return data || [];
  }

  return [...data].sort((itemA, itemB) => {
    const valA = customGetter ? customGetter(itemA) : (itemA as any)[key];
    const valB = customGetter ? customGetter(itemB) : (itemB as any)[key];
    return compareValues(valA, valB, direction);
  });
}

export interface SortHeaderProps<T = any> {
  field?: string;
  children: React.ReactNode;
  align?: 'right' | 'center' | 'left';
  className?: string;
  getter?: (item: T) => any;
  sortable?: boolean;
  title?: string;
  iconClassName?: string;
}

/**
 * Hook قابل لإعادة الاستخدام لإدارة جداول البيانات وترتيب الأعمدة والبحث
 */
export function useDataTable<T = any>(
  rawData: T[] | undefined | null,
  options: UseDataTableOptions<T> = {}
) {
  const {
    initialKey = null,
    initialDirection = null,
    getters = {},
    searchQuery = '',
    searchFields = [],
  } = options;

  const [sortConfig, setSortConfig] = useState<SortConfig<T>>({
    key: initialKey,
    direction: initialDirection,
    getter: initialKey && getters[initialKey] ? getters[initialKey] : undefined,
  });

  // تغيير اتجاه الترتيب أو العمود (None -> Asc -> Desc -> Reset)
  const requestSort = useCallback(
    (key: string, customGetter?: (item: T) => any) => {
      setSortConfig((prev) => {
        const getter = customGetter || getters[key];
        if (prev.key === key) {
          if (prev.direction === 'asc') {
            return { key, direction: 'desc', getter };
          }
          if (prev.direction === 'desc') {
            // العودة للحالة الافتراضية أو التبديل
            return { key: initialKey, direction: initialDirection, getter: initialKey ? getters[initialKey] : undefined };
          }
          return { key, direction: 'asc', getter };
        }
        return { key, direction: 'asc', getter };
      });
    },
    [getters, initialKey, initialDirection]
  );

  // إعادة التعيين
  const resetSort = useCallback(() => {
    setSortConfig({
      key: initialKey,
      direction: initialDirection,
      getter: initialKey && getters[initialKey] ? getters[initialKey] : undefined,
    });
  }, [initialKey, initialDirection, getters]);

  // تصفية وترتيب البيانات المحسوبة
  const sortedData = useMemo(() => {
    if (!rawData) return [];

    let filtered = rawData;

    // تصفية البحث إن وجد
    if (searchQuery.trim() && searchFields.length > 0) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((item) => {
        return searchFields.some((field) => {
          let val: any;
          if (typeof field === 'function') {
            val = field(item);
          } else {
            val = (item as any)[field];
          }
          if (val === null || val === undefined) return false;
          return String(val).toLowerCase().includes(q);
        });
      });
    }

    if (!sortConfig.key || !sortConfig.direction) {
      return filtered;
    }

    const activeGetter = sortConfig.getter || getters[sortConfig.key];
    return sortData(filtered, sortConfig.key, sortConfig.direction, activeGetter);
  }, [rawData, sortConfig, getters, searchQuery, searchFields]);

  // الحصول على اتجاه ترتيب عمود معين
  const getSortDirection = useCallback(
    (field: string): SortDirection => {
      return sortConfig.key === field ? sortConfig.direction : null;
    },
    [sortConfig]
  );

  /**
   * مكون رأس العمود التفاعلي الجاهز والمزود بمؤشرات الترتيب والتأثيرات الحركية
   */
  const SortHeader = useCallback(
    ({
      field,
      children,
      align = 'center',
      className = '',
      getter,
      sortable = true,
      title,
      iconClassName = '',
    }: SortHeaderProps<T>) => {
      const isCurrent = Boolean(field && sortConfig.key === field);
      const currentDirection = isCurrent ? sortConfig.direction : null;
      const canSort = sortable && Boolean(field);

      const handleClick = () => {
        if (canSort && field) {
          requestSort(field, getter);
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
                } ${iconClassName}`}
              >
                {currentDirection === 'asc' ? (
                  <ArrowUp className="w-3.5 h-3.5 stroke-[2.5]" />
                ) : currentDirection === 'desc' ? (
                  <ArrowDown className="w-3.5 h-3.5 stroke-[2.5]" />
                ) : (
                  <ArrowUpDown className="w-3 h-3 stroke-[2]" />
                )}
              </span>
            )}
          </div>
        </th>
      );
    },
    [sortConfig, requestSort]
  );

  return {
    sortedData,
    sortConfig,
    sortKey: sortConfig.key,
    sortDirection: sortConfig.direction,
    requestSort,
    resetSort,
    getSortDirection,
    setSortConfig,
    SortHeader,
  };
}

export default useDataTable;
