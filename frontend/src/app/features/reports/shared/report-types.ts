// Shared types for the reusable report framework.

export type FilterType = 'date' | 'text' | 'select' | 'number';

export interface FilterOption { value: string | number; label: string }

export interface FilterDef {
  key:           string;
  label:         string;
  type:          FilterType;
  options?:      FilterOption[];                 // for type='select'
  defaultValue?: string | number;
  placeholder?:  string;
  /** col-span on the responsive 4-col grid; defaults to 1 */
  span?:         1 | 2 | 3 | 4;
  min?:          number;
  step?:         number;
}

export type ColumnAlign = 'left' | 'center' | 'right';
export type ColumnType  = 'text' | 'date' | 'number' | 'currency';

export interface ColumnDef<Row = any> {
  key:    string;            // path into row (supports dot notation)
  label:  string;
  type?:  ColumnType;        // default 'text'
  align?: ColumnAlign;
  /** pixel width (number) or auto */
  width?: number;
  /** show bold text */
  bold?:  boolean;
  /** truncate long content */
  ellipsis?: boolean;
  /** custom formatter — runs after type-based formatting */
  format?: (value: any, row: Row) => string;
  /** include this column in CSV export (default true) */
  exportCsv?: boolean;
  /** include this column in the totals row (sums numeric values) */
  total?: boolean;
  /** allow user to sort by this column (default true) */
  sortable?: boolean;
}

export interface KpiChip {
  label: string;
  value: string;
  /** apply the indigo gradient highlight */
  accent?: boolean;
}
