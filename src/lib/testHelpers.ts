import { parseNeeds } from './needsParser';
import type { AccId, NeedLevel } from './types';

export const needsFromParser = (text: string) =>
  Object.fromEntries(parseNeeds(text).map((s) => [s.id, s.level])) as Partial<Record<AccId, NeedLevel>>;
