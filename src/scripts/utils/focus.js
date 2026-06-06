const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
]
  .map(selector => `${selector}:not([inert])`)
  .join(', ')

const isVisible = element => {
  if (!element) return false
  return element.getClientRects().length > 0
}

export const getFocusableElements = container => {
  if (!container) return []

  return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter(isVisible)
}

export const focusFirstIn = (container, fallbackElement = null) => {
  const focusable = getFocusableElements(container)
  const target = focusable[0] ?? fallbackElement

  if (!target) return
  target.focus()
}

export const trapFocus = (event, container, fallbackElement = null) => {
  if (event.key !== 'Tab') return

  const focusable = getFocusableElements(container)
  if (focusable.length === 0) {
    event.preventDefault()
    fallbackElement?.focus()
    return
  }

  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  const active = container.ownerDocument.activeElement

  if (event.shiftKey && active === first) {
    event.preventDefault()
    last.focus()
    return
  }

  if (!event.shiftKey && active === last) {
    event.preventDefault()
    first.focus()
  }
}
