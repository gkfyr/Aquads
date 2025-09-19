import { useEffect, useRef } from 'react'
import type { CSSProperties } from 'react'
import { mount as sdkMount, setApiBase as sdkSetApiBase } from '@aquads/sdk'

export type AdSlotProps = {
  slotId: string
  className?: string
  style?: CSSProperties
  apiBase?: string
}

export function AdSlot({ slotId, className, style, apiBase }: AdSlotProps) {
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (apiBase) sdkSetApiBase(apiBase)
    const el = ref.current
    if (!el || !slotId) return
    // defer to next tick to ensure DOM is ready
    const id = setTimeout(() => {
      try { sdkMount(el, slotId) } catch {}
    }, 0)
    return () => clearTimeout(id)
  }, [slotId, apiBase])

  return <div ref={ref} className={className} style={style} data-slot-id={slotId} />
}

export function setApiBase(base: string) {
  sdkSetApiBase(base)
}

export default AdSlot
