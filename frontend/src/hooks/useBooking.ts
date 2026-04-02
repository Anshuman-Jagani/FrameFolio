import { useMemo, useState } from 'react'
import type { Photographer } from '../lib/uiTypes'

export default function useBooking({
  photographer,
  initialDate,
}: {
  photographer: Photographer
  initialDate?: string
}) {
  const [date, setDate] = useState<string>(
    initialDate ?? new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString().slice(0, 10),
  )

  const price = useMemo(() => photographer.price, [photographer.price])

  return {
    photographer,
    date,
    setDate,
    price,
  }
}

