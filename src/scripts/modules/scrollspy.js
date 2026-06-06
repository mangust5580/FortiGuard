import { ATTRIBUTES, CLASSES } from '../config/constants.js'
import { SELECTORS } from '../config/selectors.js'

// Activation band below the sticky header, as a share of the viewport height.
// The IntersectionObserver root is shrunk from the top by the live header height
// (so the band starts right under the header, matching the anchor landing line)
// and from the bottom by this amount, leaving a thin strip near the top where
// the "current" section is detected.
const ACTIVE_ZONE_BOTTOM_MARGIN_PERCENT = 70

// After a TOC click the page smooth-scrolls through intermediate sections; ignore
// observer-driven updates for this long so the active item doesn't flicker before
// the scroll settles. The click itself sets the active state immediately.
const CLICK_SETTLE_MS = 600

// When the viewport is scrolled to (within this many px of) the page bottom, the
// final sections can no longer reach the activation band. Activate the last TOC
// entry directly so the bottom-most item is selectable via scroll, not just click.
const BOTTOM_EDGE_THRESHOLD_PX = 2

const ARIA_CURRENT_VALUE = 'location'

export default class Scrollspy {
  constructor(root = document) {
    this.root = root
    this.document = root?.ownerDocument ?? document
    this.window = this.document?.defaultView ?? window
    this.isInitialized = false
    this.instances = []
    this.observer = null
    this.onHashChange = this.onHashChange.bind(this)
  }

  init() {
    if (this.isInitialized) return
    if (typeof this.window.IntersectionObserver !== 'function') return

    const roots = this.root.querySelectorAll(SELECTORS.scrollspy.root)
    roots.forEach(tocRoot => {
      const entries = this.collectEntries(tocRoot)
      if (entries.length === 0) return

      const instance = {
        root: tocRoot,
        entries,
        visible: new Map(),
        activeId: null,
        lockedUntil: 0,
        onLinkClick: null,
      }

      // A click should reflect immediately, before the observer catches up after
      // the smooth anchor scroll.
      instance.onLinkClick = event => {
        const link = event.target.closest(SELECTORS.scrollspy.link)
        if (!link || !tocRoot.contains(link)) return
        const targetId = this.resolveTargetId(link)
        if (!targetId || !instance.entries.some(entry => entry.id === targetId)) return
        instance.lockedUntil = this.now() + CLICK_SETTLE_MS
        this.setActive(instance, targetId)
      }

      tocRoot.addEventListener('click', instance.onLinkClick)
      this.instances.push(instance)
    })

    if (this.instances.length === 0) return

    const headerOffsetPx = this.getHeaderOffsetPx()
    this.observer = new this.window.IntersectionObserver(changes => this.onIntersect(changes), {
      root: null,
      rootMargin: `-${headerOffsetPx}px 0px -${ACTIVE_ZONE_BOTTOM_MARGIN_PERCENT}% 0px`,
      threshold: 0,
    })

    this.instances.forEach(instance => {
      instance.entries.forEach(entry => this.observer.observe(entry.section))
    })

    // Reflect an incoming hash (deep link) before the observer settles.
    this.syncFromHash()
    this.syncInitialState()
    this.window.addEventListener('hashchange', this.onHashChange)

    this.isInitialized = true
  }

  destroy() {
    if (this.observer) {
      this.observer.disconnect()
      this.observer = null
    }

    this.instances.forEach(instance => {
      instance.root.removeEventListener('click', instance.onLinkClick)
    })

    this.window.removeEventListener('hashchange', this.onHashChange)
    this.instances = []
    this.isInitialized = false
  }

  collectEntries(tocRoot) {
    const links = Array.from(tocRoot.querySelectorAll(SELECTORS.scrollspy.link))
    const entries = []

    links.forEach(link => {
      const targetId = this.resolveTargetId(link)
      if (!targetId) return

      const section = this.document.getElementById(targetId)
      if (!section) return

      const item = link.closest(SELECTORS.scrollspy.item) ?? link
      entries.push({ id: targetId, link, item, section })
    })

    return entries
  }

  resolveTargetId(link) {
    const hash = link.hash
    if (!hash || hash.length < 2) return null
    return decodeURIComponent(hash.slice(1))
  }

  getHeaderOffsetPx() {
    const header = this.document.querySelector(SELECTORS.header.root)
    if (!header) return 0
    return Math.round(header.getBoundingClientRect().height)
  }

  onIntersect(changes) {
    this.instances.forEach(instance => {
      let touched = false

      changes.forEach(change => {
        const entry = instance.entries.find(candidate => candidate.section === change.target)
        if (!entry) return
        instance.visible.set(entry.id, change.isIntersecting)
        touched = true
      })

      if (!touched || this.now() < instance.lockedUntil) return

      // At the very bottom of the page the last sections can't scroll up into the
      // band, so pin the final entry — otherwise it could never become active.
      if (this.isScrolledToBottom()) {
        const last = instance.entries[instance.entries.length - 1]
        if (last) this.setActive(instance, last.id)
        return
      }

      // If several compact sections overlap the activation band, the last
      // heading that has entered that band is the one the user has reached.
      // This keeps clicked/anchored final sections from rolling back to the
      // previous long section after smooth scroll settles.
      const current = this.getCurrentEntry(instance)
      if (current) this.setActive(instance, current.id)
    })
  }

  getCurrentEntry(instance) {
    const headerOffsetPx = this.getHeaderOffsetPx()
    const activationBandBottomPx =
      this.window.innerHeight * ((100 - ACTIVE_ZONE_BOTTOM_MARGIN_PERCENT) / 100)
    const activationLinePx = Math.max(headerOffsetPx, activationBandBottomPx)

    const reachedEntries = instance.entries.filter(entry => {
      const rect = entry.section.getBoundingClientRect()
      return rect.top <= activationLinePx
    })

    return reachedEntries[reachedEntries.length - 1] ?? null
  }

  isScrolledToBottom() {
    const scrollElement = this.document.scrollingElement ?? this.document.documentElement
    if (!scrollElement) return false
    const scrolledBottom = this.window.scrollY + this.window.innerHeight
    return scrolledBottom >= scrollElement.scrollHeight - BOTTOM_EDGE_THRESHOLD_PX
  }

  setActive(instance, activeId) {
    if (instance.activeId === activeId) return

    instance.entries.forEach(entry => {
      const isActive = entry.id === activeId
      entry.item.classList.toggle(CLASSES.isActive, isActive)

      if (isActive) {
        entry.link.setAttribute(ATTRIBUTES.ariaCurrent, ARIA_CURRENT_VALUE)
      } else {
        entry.link.removeAttribute(ATTRIBUTES.ariaCurrent)
      }
    })

    instance.activeId = activeId
  }

  syncFromHash() {
    const hash = this.window.location?.hash
    if (!hash || hash.length < 2) return

    const id = decodeURIComponent(hash.slice(1))
    this.instances.forEach(instance => {
      if (instance.entries.some(entry => entry.id === id)) {
        // Hold the observer off while the deep-link / hashchange smooth scroll
        // settles, same as a click — avoids flicker through intermediate sections.
        instance.lockedUntil = this.now() + CLICK_SETTLE_MS
        this.setActive(instance, id)
      }
    })
  }

  syncInitialState() {
    this.instances.forEach(instance => {
      if (!instance.activeId && instance.entries[0]) {
        this.setActive(instance, instance.entries[0].id)
      }
    })
  }

  onHashChange() {
    this.syncFromHash()
  }

  now() {
    return this.window.performance?.now?.() ?? Date.now()
  }
}
