import { CLASSES } from '../config/constants.js'
import { SELECTORS } from '../config/selectors.js'

// Scroll offset (px) past which the header switches to its scrolled state.
const SCROLL_THRESHOLD = 8

export default class HeaderScroll {
  constructor(root = document) {
    this.root = root
    this.window = root?.defaultView ?? window
    this.header = null
    this.isInitialized = false
    this.onScroll = this.onScroll.bind(this)
  }

  init() {
    if (this.isInitialized) return

    this.header = this.root.querySelector(SELECTORS.header.root)
    if (!this.header) return

    this.window.addEventListener('scroll', this.onScroll, { passive: true })
    this.onScroll()
    this.isInitialized = true
  }

  destroy() {
    if (!this.header) return

    this.window.removeEventListener('scroll', this.onScroll)
    this.header.classList.remove(CLASSES.isScrolled)
    this.isInitialized = false
  }

  onScroll() {
    const isScrolled = this.window.scrollY > SCROLL_THRESHOLD
    this.header.classList.toggle(CLASSES.isScrolled, isScrolled)
  }
}
