import { useState, useEffect } from 'react'

const MOBILE_BREAKPOINT = 768

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < MOBILE_BREAKPOINT
    }
    return false // SSR default: assume desktop
  })

  useEffect(() => {
    const check = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }

    // Listen for resize
    window.addEventListener('resize', check)

    // Also check on orientation change (mobile)
    window.addEventListener('orientationchange', () => {
      // Small delay to let the browser settle
      setTimeout(check, 100)
    })

    // Initial check (in case SSR default was wrong)
    check()

    return () => {
      window.removeEventListener('resize', check)
      window.removeEventListener('orientationchange', check)
    }
  }, [])

  return isMobile
}
