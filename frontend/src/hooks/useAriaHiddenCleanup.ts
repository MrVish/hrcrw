import { useEffect } from 'react'

/**
 * Hook to prevent the root element from getting stuck with aria-hidden="true"
 * This can happen when Material-UI modals/drawers don't clean up properly
 */
export const useAriaHiddenCleanup = () => {
  useEffect(() => {
    const checkAndCleanup = () => {
      const root = document.getElementById('root')
      if (root && root.getAttribute('aria-hidden') === 'true') {
        // Check if there are any open modals/drawers that should keep aria-hidden
        const openModals = document.querySelectorAll('[role="dialog"][aria-modal="true"]')
        const openDrawers = document.querySelectorAll('.MuiDrawer-modal[aria-hidden="false"]')
        
        // If no open modals or drawers, remove aria-hidden
        if (openModals.length === 0 && openDrawers.length === 0) {
          root.removeAttribute('aria-hidden')
          // Also restore body scroll if it was disabled
          if (document.body.style.overflow === 'hidden') {
            document.body.style.overflow = ''
          }
        }
      }
    }

    // Check immediately
    checkAndCleanup()

    // Set up a periodic check (every 500ms) to catch any stuck states
    const intervalId = setInterval(checkAndCleanup, 500)

    // Also listen for specific events that might indicate modal/drawer state changes
    const handleFocusIn = () => {
      // Small delay to let Material-UI finish its work
      setTimeout(checkAndCleanup, 100)
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      // If Escape is pressed, check for cleanup after a delay
      if (event.key === 'Escape') {
        setTimeout(checkAndCleanup, 200)
      }
    }

    document.addEventListener('focusin', handleFocusIn)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      clearInterval(intervalId)
      document.removeEventListener('focusin', handleFocusIn)
      document.removeEventListener('keydown', handleKeyDown)
      // Final cleanup
      checkAndCleanup()
    }
  }, [])
}