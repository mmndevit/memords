import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  BookOpenText,
  Check,
  CircleUser,
  Inbox,
  Layers,
  Search,
  Trash2,
  Trophy,
  Volume2,
  X,
  type LucideIcon,
} from 'lucide-react'

type IconSlotProps = {
  /** Which icon to render. Unknown labels fall back to a dashed placeholder. */
  label?: string
  /** Kept for call-site compatibility, but ignored — every icon renders at ICON_SIZE. */
  size?: number
  className?: string
}

/** All icons share one size for a consistent look. */
const ICON_SIZE = 16

/**
 * Maps the app's semantic icon names to Lucide icons. Keeping the lookup here
 * means callers keep passing a plain `label` string and never import Lucide
 * directly — swapping an icon is a one-line change in this table.
 */
const ICONS: Record<string, LucideIcon> = {
  speaker: Volume2,
  cards: Layers,
  warning: AlertTriangle,
  trophy: Trophy,
  trash: Trash2,
  search: Search,
  logo: BookOpenText,
  empty: Inbox,
  close: X,
  bell: Bell,
  back: ArrowLeft,
  avatar: CircleUser,
  check: Check,
}

/**
 * Renders a Lucide icon for the given `label`, sized to `size`. Colour and
 * spacing come from `className` (icons use `currentColor`, so any `text-*`
 * class tints them). If the label isn't in the table above, we render the old
 * dashed placeholder so a missing mapping is obvious rather than invisible.
 */
export function IconSlot({ label, className = '' }: IconSlotProps) {
  const Icon = label ? ICONS[label] : undefined

  if (!Icon) {
    return (
      <span
        className={`icon-slot rounded-[8px] border border-dashed border-line text-[9px] uppercase tracking-wide text-muted/60 ${className}`}
        style={{ width: ICON_SIZE, height: ICON_SIZE }}
        data-icon={label}
        aria-hidden="true"
        title={label ? `icon: ${label}` : 'icon'}
      />
    )
  }

  return (
    <Icon
      size={ICON_SIZE}
      className={className}
      aria-hidden="true"
      strokeWidth={2}
    />
  )
}
