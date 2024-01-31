import { useState } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'

export const useTapLongKey = (key: string, callback: () => void) => {
  const [timer, setTimer] = useState<ReturnType<typeof setTimeout> | null>(null)
  const [invl, setInvl] = useState<ReturnType<typeof setInterval> | null>(null)
  useHotkeys(
    key,
    () => {
      if (timer && invl) {
        clearTimeout(timer)
        clearInterval(invl)
      }
      callback()
    },
    { keyup: true },
  )
  useHotkeys(key, (e) => {
    if (e.repeat) return
    setTimer(
      setTimeout(() => {
        setInvl(setInterval(() => callback(), 50))
      }, 100),
    )
  })
}
