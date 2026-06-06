import { ATTRIBUTES, CLASSES, KEYS } from '../config/constants.js'
import { SELECTORS } from '../config/selectors.js'
import { focusFirstIn, trapFocus } from '../utils/focus.js'
import { lockBodyScroll, unlockBodyScroll } from '../utils/scroll-lock.js'

// Must stay in sync with SCSS `$breakpoints.xl` (helpers/_settings.scss): the
// header swaps inline nav for the burger/overlay at `media-down(xl)`, i.e.
// `max-width: 1279px`. Below this width the inline nav is hidden, so the overlay
// must be operable across the whole burger range (including 1200–1279px).
const OVERLAY_MENU_MAX_WIDTH_PX = 1279

export default class OverlayMenu {
  constructor(root = document) {
    this.root = root
    this.document = root?.ownerDocument ?? document
    this.window = this.document?.defaultView ?? window
    this.isInitialized = false
    this.instances = []
    this.openedInstance = null
    this.mobileBreakpoint = OVERLAY_MENU_MAX_WIDTH_PX
    this.mediaQueryList = null
    this.onDocumentKeyDown = this.onDocumentKeyDown.bind(this)
    this.onViewportChange = this.onViewportChange.bind(this)
  }

  init() {
    if (this.isInitialized) return

    const roots = this.root.querySelectorAll(SELECTORS.overlayMenu.root)
    roots.forEach(root => {
      const burgerButton = root.querySelector(SELECTORS.overlayMenu.burgerButton)
      const panel = root.querySelector(SELECTORS.overlayMenu.panel)
      if (!burgerButton || !panel) return

      const closeElements = Array.from(root.querySelectorAll(SELECTORS.overlayMenu.close))

      const instance = {
        root,
        burgerButton,
        panel,
        closeElements,
        onBurgerClick: null,
        onPanelClick: null,
        onCloseClicks: [],
      }

      if (!panel.hasAttribute(ATTRIBUTES.tabindex)) {
        panel.setAttribute(ATTRIBUTES.tabindex, '-1')
      }

      instance.onBurgerClick = () => this.toggle(instance)
      burgerButton.addEventListener('click', instance.onBurgerClick)
      instance.onPanelClick = event => this.onPanelClick(event, instance)
      panel.addEventListener('click', instance.onPanelClick)

      closeElements.forEach(closeElement => {
        const onCloseClick = event => {
          const link = event.currentTarget?.closest?.('a[href]')
          if (!link) {
            event.preventDefault()
          }
          this.close(instance, { restoreFocus: true })
        }

        closeElement.addEventListener('click', onCloseClick)
        instance.onCloseClicks.push(onCloseClick)
      })

      this.setOpen(instance, false)
      this.instances.push(instance)
    })

    this.mediaQueryList = this.window.matchMedia(`(max-width: ${this.mobileBreakpoint}px)`)
    if (typeof this.mediaQueryList.addEventListener === 'function') {
      this.mediaQueryList.addEventListener('change', this.onViewportChange)
    } else if (typeof this.mediaQueryList.addListener === 'function') {
      this.mediaQueryList.addListener(this.onViewportChange)
    }

    this.onViewportChange()
    this.document.addEventListener('keydown', this.onDocumentKeyDown)
    this.isInitialized = true
  }

  destroy() {
    this.instances.forEach(instance => {
      instance.burgerButton.removeEventListener('click', instance.onBurgerClick)
      instance.panel.removeEventListener('click', instance.onPanelClick)
      instance.closeElements.forEach((closeElement, index) => {
        closeElement.removeEventListener('click', instance.onCloseClicks[index])
      })

      this.setOpen(instance, false)
    })

    if (this.mediaQueryList) {
      if (typeof this.mediaQueryList.removeEventListener === 'function') {
        this.mediaQueryList.removeEventListener('change', this.onViewportChange)
      } else if (typeof this.mediaQueryList.removeListener === 'function') {
        this.mediaQueryList.removeListener(this.onViewportChange)
      }
      this.mediaQueryList = null
    }

    this.instances = []
    this.openedInstance = null
    this.document.removeEventListener('keydown', this.onDocumentKeyDown)
    this.unlockBodyScroll()
    this.isInitialized = false
  }

  toggle(instance) {
    const isOpen = instance.root.classList.contains(CLASSES.isOpen)
    if (isOpen) {
      this.close(instance, { restoreFocus: true })
      return
    }

    this.setOpen(instance, true)
  }

  setOpen(instance, isOpen, { restoreFocus = false } = {}) {
    const isMobile = this.isMobileViewport()
    const nextOpen = isMobile ? isOpen : false

    if (nextOpen && this.openedInstance && this.openedInstance !== instance) {
      this.close(this.openedInstance, { restoreFocus: false })
    }

    instance.root.classList.toggle(CLASSES.isOpen, nextOpen)
    instance.burgerButton.setAttribute(ATTRIBUTES.ariaExpanded, String(nextOpen))
    this.syncPanelAccessibility(instance, { isMobile, isOpen: nextOpen })

    if (nextOpen) {
      this.openedInstance = instance
      this.lockBodyScroll()
      focusFirstIn(instance.panel, instance.panel)
      return
    }

    if (this.openedInstance === instance) {
      this.openedInstance = null
      this.unlockBodyScroll()

      if (restoreFocus) {
        instance.burgerButton.focus()
      }
    }
  }

  close(instance, { restoreFocus = true } = {}) {
    this.setOpen(instance, false, { restoreFocus })
  }

  isMobileViewport() {
    if (this.mediaQueryList) return this.mediaQueryList.matches
    return this.window.innerWidth <= this.mobileBreakpoint
  }

  syncPanelAccessibility(instance, { isMobile, isOpen }) {
    if (isMobile) {
      if (isOpen) {
        instance.panel.removeAttribute(ATTRIBUTES.hidden)
        instance.panel.setAttribute(ATTRIBUTES.ariaHidden, 'false')
      } else {
        instance.panel.setAttribute(ATTRIBUTES.hidden, '')
        instance.panel.setAttribute(ATTRIBUTES.ariaHidden, 'true')
      }
      return
    }

    instance.panel.removeAttribute(ATTRIBUTES.hidden)
    instance.panel.removeAttribute(ATTRIBUTES.ariaHidden)
  }

  onViewportChange() {
    const isMobile = this.isMobileViewport()

    this.instances.forEach(instance => {
      const isOpen = isMobile && instance.root.classList.contains(CLASSES.isOpen)
      instance.burgerButton.setAttribute(ATTRIBUTES.ariaExpanded, String(isOpen))
      this.syncPanelAccessibility(instance, { isMobile, isOpen })
    })

    if (!isMobile && this.openedInstance) {
      this.openedInstance.root.classList.remove(CLASSES.isOpen)
      this.openedInstance = null
      this.unlockBodyScroll()
    }
  }

  onPanelClick(event, instance) {
    const link = event.target.closest('a[href]')
    if (!link || !instance.panel.contains(link)) return
    this.close(instance, { restoreFocus: true })
  }

  onDocumentKeyDown(event) {
    if (!this.openedInstance) return
    if (event.key === KEYS.Escape) {
      event.preventDefault()
      const current = this.openedInstance
      this.close(current, { restoreFocus: true })
      return
    }

    trapFocus(event, this.openedInstance.panel, this.openedInstance.panel)
  }

  lockBodyScroll() {
    lockBodyScroll(this.document)
  }

  unlockBodyScroll() {
    unlockBodyScroll(this.document)
  }
}
