import { useState, useRef, useEffect } from 'react'
import { useThemeColors } from '@/contexts/ThemeContext'

interface ModelTooltipProps {
  text: string
  children: React.ReactNode
  delay?: number
}

export function ModelTooltip({ text, children, delay = 300 }: ModelTooltipProps) {
  const c = useThemeColors()
  const [visible, setVisible] = useState(false)
  const [position, setPosition] = useState<'top' | 'bottom'>('top')
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const show = () => {
    timeoutRef.current = setTimeout(() => {
      if (wrapperRef.current) {
        const rect = wrapperRef.current.getBoundingClientRect()
        setPosition(rect.top < 60 ? 'bottom' : 'top')
      }
      setVisible(true)
    }, delay)
  }

  const hide = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setVisible(false)
  }

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  if (!text) return <>{children}</>

  return (
    <div
      ref={wrapperRef}
      onMouseEnter={show}
      onMouseLeave={hide}
      style={{ position: 'relative', display: 'inline-flex' }}
    >
      {children}
      <div
        style={{
          position: 'absolute',
          [position === 'top' ? 'bottom' : 'top']: 'calc(100% + 8px)',
          left: '50%',
          transform: 'translateX(-50%)',
          background: c.panel,
          border: `1px solid ${c.border}`,
          borderRadius: 8,
          padding: '6px 10px',
          fontSize: 11,
          lineHeight: 1.4,
          color: c.text,
          whiteSpace: 'nowrap',
          maxWidth: 240,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          pointerEvents: 'none',
          zIndex: 9999,
          boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.15s ease',
        }}
      >
        {text}
        <div
          style={{
            position: 'absolute',
            [position === 'top' ? 'bottom' : 'top']: -4,
            left: '50%',
            transform: 'translateX(-50%) rotate(45deg)',
            width: 7,
            height: 7,
            background: c.panel,
            borderRight: position === 'top' ? `1px solid ${c.border}` : 'none',
            borderBottom: position === 'top' ? `1px solid ${c.border}` : 'none',
            borderLeft: position === 'bottom' ? `1px solid ${c.border}` : 'none',
            borderTop: position === 'bottom' ? `1px solid ${c.border}` : 'none',
          }}
        />
      </div>
    </div>
  )
}
