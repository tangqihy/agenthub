import { useEffect, useRef } from 'react'
import { perf } from '../services/perf'

export function usePerfMeasure(componentName: string) {
  const startTime = useRef(performance.now())

  useEffect(() => {
    const renderTime = performance.now() - startTime.current
    perf.trackApi(`render:${componentName}`, renderTime)
    if (renderTime > 100) {
      console.warn(`[Perf] SLOW render: ${componentName} took ${renderTime.toFixed(0)}ms`)
    }
  })
}
