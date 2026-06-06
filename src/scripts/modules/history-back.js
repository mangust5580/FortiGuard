import { ATTRIBUTES } from '../config/constants.js'
import { SELECTORS } from '../config/selectors.js'

// A populated session history (more than the current entry) means there is a
// previous page to return to; otherwise we fall back to a provided URL.
const MIN_HISTORY_LENGTH_FOR_BACK = 1

export default class HistoryBack {
  constructor(root = document) {
    this.root = root
    this.window = root?.defaultView ?? window
    this.buttons = []
    this.onClick = this.onClick.bind(this)
  }

  init() {
    this.buttons = Array.from(this.root.querySelectorAll(SELECTORS.historyBack.root))
    this.buttons.forEach(button => button.addEventListener('click', this.onClick))
  }

  destroy() {
    this.buttons.forEach(button => button.removeEventListener('click', this.onClick))
    this.buttons = []
  }

  onClick(event) {
    const fallback = event.currentTarget.getAttribute(ATTRIBUTES.historyBackFallback)

    if (this.window.history.length > MIN_HISTORY_LENGTH_FOR_BACK && this.hasSameOriginReferrer()) {
      this.window.history.back()
      return
    }

    if (fallback) this.window.location.assign(fallback)
  }

  hasSameOriginReferrer() {
    const referrer = this.root.referrer || ''
    if (!referrer) return false

    try {
      return new URL(referrer).origin === this.window.location.origin
    } catch {
      return false
    }
  }
}