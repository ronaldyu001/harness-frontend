import { motion } from 'motion/react'

export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={`switch${checked ? ' switch--on' : ''}`}
      onClick={() => onChange(!checked)}
    >
      <motion.span
        className="switch__knob"
        layout
        transition={{ type: 'spring', stiffness: 700, damping: 38 }}
      />
    </button>
  )
}
