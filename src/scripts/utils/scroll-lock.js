import { CLASSES } from '../config/constants.js'

const stateByDocument = new WeakMap()

const getState = document => {
  const existing = stateByDocument.get(document)
  if (existing) return existing

  const initial = {
    lockCount: 0,
    inlineOverflow: '',
    inlinePaddingInlineEnd: '',
  }

  stateByDocument.set(document, initial)
  return initial
}

const getScrollbarWidth = document => {
  const view = document.defaultView ?? window
  return Math.max(0, view.innerWidth - document.documentElement.clientWidth)
}

export const lockBodyScroll = document => {
  const body = document?.body
  const documentElement = document?.documentElement

  if (!body || !documentElement) return

  const state = getState(document)
  if (state.lockCount === 0) {
    state.inlineOverflow = body.style.overflow
    state.inlinePaddingInlineEnd = body.style.paddingInlineEnd

    const scrollbarWidth = getScrollbarWidth(document)
    if (scrollbarWidth > 0) {
      const computed = document.defaultView?.getComputedStyle(body).paddingInlineEnd ?? '0'
      const basePadding = Number.parseFloat(computed) || 0
      body.style.paddingInlineEnd = `${basePadding + scrollbarWidth}px`
    }

    body.classList.add(CLASSES.isLocked)
    body.style.overflow = 'hidden'
  }

  state.lockCount += 1
}

export const unlockBodyScroll = document => {
  const body = document?.body
  const state = stateByDocument.get(document)

  if (!body || !state || state.lockCount === 0) return

  state.lockCount -= 1
  if (state.lockCount > 0) return

  body.classList.remove(CLASSES.isLocked)
  body.style.overflow = state.inlineOverflow
  body.style.paddingInlineEnd = state.inlinePaddingInlineEnd
}
