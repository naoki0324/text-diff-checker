
export type DiffLineType = 'added' | 'removed' | 'common';

export interface DiffLine {
  value: string;
  type: DiffLineType;
}
