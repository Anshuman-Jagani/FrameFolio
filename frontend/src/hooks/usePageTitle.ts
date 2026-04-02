import { useEffect } from 'react'

/** Sets document.title, restores on unmount */
export function usePageTitle(title: string) {
  useEffect(() => {
    const prev = document.title
    document.title = title ? `${title} — FrameFolio` : 'FrameFolio'
    return () => { document.title = prev }
  }, [title])
}
