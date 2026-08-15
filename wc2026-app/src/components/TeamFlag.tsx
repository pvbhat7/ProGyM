import { useState } from 'react'
import { flagUrl } from '../constants/teamFlags'
import type { FlagSize } from '../constants/teamFlags'

interface Props {
  code: string | null | undefined  // FIFA 3-letter code, e.g. "MEX"
  size?: FlagSize                  // CDN resolution (default 80)
  className?: string               // extra classes for the img/box
  title?: string                   // tooltip
}

// Renders a country flag from the FIFA short_code via flagcdn.com.
// Falls back to a small gray box with the code if the CDN image fails or code is unknown.
// Use Tailwind sizing classes (e.g. w-10 h-7) on `className` to control display size.
export default function TeamFlag({ code, size = 80, className = '', title }: Props) {
  const [errored, setErrored] = useState(false)
  const url = flagUrl(code, size)
  const safeCode = (code || '?').toUpperCase()

  if (!url || errored) {
    return (
      <span
        className={`inline-flex items-center justify-center bg-gray-200 text-gray-500 text-[9px] font-bold rounded-sm ${className}`}
        title={title || safeCode}
      >
        {safeCode.slice(0, 3)}
      </span>
    )
  }

  return (
    <img
      src={url}
      alt={safeCode}
      title={title || safeCode}
      onError={() => setErrored(true)}
      className={`inline-block object-cover rounded-sm shadow-sm ${className}`}
      loading="lazy"
    />
  )
}
