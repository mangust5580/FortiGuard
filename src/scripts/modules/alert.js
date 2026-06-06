import { ATTRIBUTES, CLASSES } from '../config/constants.js'
import { SELECTORS } from '../config/selectors.js'

const DISMISS_GUARD_TIMEOUT_MS = 1000

export default class Alert {
  constructor(root = document) {
    this.root = root
    this.instances = []
    this.isInitialized = false
  }

  init() {
    if (this.isInitialized) return

    const roots = this.root.querySelectorAll(SELECTORS.alert.root)

    roots.forEach(root => {
      const closeButtons = Array.from(root.querySelectorAll(SELECTORS.alert.close))

      if (closeButtons.length === 0) return

      const instance = {
        root,
        closeButtons,
        onCloseClicks: [],
        dismissGuardTimeoutId: null,
        onDismissTransitionEnd: null,
      }

      closeButtons.forEach(closeButton => {
        const onCloseClick = event => {
          event.preventDefault()
          this.dismiss(instance)
        }

        closeButton.addEventListener('click', onCloseClick)
        instance.onCloseClicks.push(onCloseClick)
      })

      this.instances.push(instance)
    })

    this.isInitialized = true
  }

  destroy() {
    this.instances.forEach(instance => {
      this.cleanupDismissHandlers(instance)

      instance.closeButtons.forEach((closeButton, index) => {
        closeButton.removeEventListener('click', instance.onCloseClicks[index])
      })
    })

    this.instances = []
    this.isInitialized = false
  }

  dismiss(instance) {
    if (instance.root.classList.contains(CLASSES.isHidden)) return

    this.cleanupDismissHandlers(instance)
    instance.root.classList.add(CLASSES.isDismissed)

    const hide = () => {
      instance.root.classList.add(CLASSES.isHidden)
      instance.root.classList.remove(CLASSES.isDismissed)
      instance.root.setAttribute(ATTRIBUTES.hidden, '')
      this.cleanupDismissHandlers(instance)
    }

    instance.onDismissTransitionEnd = event => {
      if (event.target !== instance.root) return
      hide()
    }

    instance.root.addEventListener('transitionend', instance.onDismissTransitionEnd, { once: true })

    instance.dismissGuardTimeoutId = window.setTimeout(() => {
      if (instance.root.classList.contains(CLASSES.isHidden)) return
      hide()
    }, DISMISS_GUARD_TIMEOUT_MS)
  }

  cleanupDismissHandlers(instance) {
    if (instance.onDismissTransitionEnd) {
      instance.root.removeEventListener('transitionend', instance.onDismissTransitionEnd)
      instance.onDismissTransitionEnd = null
    }

    if (instance.dismissGuardTimeoutId) {
      window.clearTimeout(instance.dismissGuardTimeoutId)
      instance.dismissGuardTimeoutId = null
    }
  }
}
