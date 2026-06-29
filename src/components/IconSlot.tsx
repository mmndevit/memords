type IconSlotProps = {
  /** Optional hint for which icon belongs here, shown faintly until you add it. */
  label?: string
  size?: number
  className?: string
}

/**
 * An empty, sized placeholder where an icon will go. Per the design brief the
 * icons are supplied separately, so this just reserves the space and outlines
 * it lightly. Drop your <svg>/<img> in here (or replace this component) later.
 */
export function IconSlot({ label, size = 20, className = '' }: IconSlotProps) {
  return (
    <span
      className={`icon-slot rounded-[8px] border border-dashed border-line text-[9px] uppercase tracking-wide text-muted/60 ${className}`}
      style={{ width: size, height: size }}
      data-icon={label}
      aria-hidden="true"
      title={label ? `icon: ${label}` : 'icon'}
    />
  )
}
