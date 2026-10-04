import { View, type ViewProps } from 'react-native';
import { cn } from '@/lib/cn';
import { shadow } from '@/theme/shadows';

type Props = ViewProps & { level?: 1 | 2 | 3; className?: string };
const LEVEL = { 1: shadow.l1, 2: shadow.l2, 3: shadow.l3 } as const;

/** DESIGN.md Level 1–3 surface. Compose screens may override radius/padding via className ONLY where Stitch does. */
export function Card({ level = 1, className, style, ...rest }: Props) {
  return (
    <View
      {...rest}
      className={cn('rounded-2xl border border-[#E8EBEF] bg-surface-container-lowest', className)}
      style={[LEVEL[level], style]}
    />
  );
}
