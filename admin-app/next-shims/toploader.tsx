import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'

type TopLoaderProps = {
  color?: string
  height?: number
  showSpinner?: boolean
}

// nextjs-toploader draws a thin bar across the top of the page on each route
// change; this reproduces that bar (same default height, color and glow).
const NextTopLoader = ({ color = '#29d', height = 3 }: TopLoaderProps) => {
  const location = useLocation()
  const [progress, setProgress] = useState<number | null>(null)
  const firstRender = useRef(true)

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    setProgress(30)
    const grow = setTimeout(() => setProgress(80), 100)
    const finish = setTimeout(() => setProgress(100), 250)
    const hide = setTimeout(() => setProgress(null), 500)
    return () => {
      clearTimeout(grow)
      clearTimeout(finish)
      clearTimeout(hide)
    }
  }, [location.pathname])

  if (progress === null) return null

  return (
    <div style={{ pointerEvents: 'none' }}>
      <div
        style={{
          background: color,
          position: 'fixed',
          zIndex: 1600,
          top: 0,
          left: 0,
          width: `${progress}%`,
          height,
          transition: 'width 200ms ease',
          boxShadow: `0 0 10px ${color}, 0 0 5px ${color}`,
        }}
      />
    </div>
  )
}

export default NextTopLoader
