const GRADIENTS = [
  'from-coral-500 to-gold-400',
  'from-gold-400 to-coral-500',
  'from-teal-400 to-coral-400',
  'from-coral-400 to-teal-400',
]

function hashName(name: string): number {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return h
}

const SIZES = {
  sm: 'w-7 h-7 text-xs',
  md: 'w-9 h-9 text-sm',
  lg: 'w-11 h-11 text-base',
  xl: 'w-20 h-20 text-3xl',
} as const

export function Avatar({
  src,
  name,
  size = 'md',
  className = '',
}: {
  src?: string | null
  name: string
  size?: keyof typeof SIZES
  className?: string
}) {
  const sizeClass = SIZES[size]
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        className={`${sizeClass} rounded-full object-cover bg-surface-2 shrink-0 ${className}`}
      />
    )
  }
  const gradient = GRADIENTS[hashName(name) % GRADIENTS.length]
  return (
    <div
      className={`${sizeClass} rounded-full bg-linear-to-br ${gradient} flex items-center justify-center font-bold text-abyss shrink-0 ${className}`}
    >
      {name[0]?.toUpperCase() ?? '?'}
    </div>
  )
}
