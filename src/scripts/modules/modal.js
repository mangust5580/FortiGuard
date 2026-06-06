import { ATTRIBUTES, CLASSES, KEYS } from '../config/constants.js'
import { SELECTORS } from '../config/selectors.js'
import { focusFirstIn, trapFocus } from '../utils/focus.js'
import { lockBodyScroll, unlockBodyScroll } from '../utils/scroll-lock.js'

const CLOSE_GUARD_TIMEOUT_MS = 500

export default class Modal {
  constructor(root = document) {
    this.root = root
    this.document = root?.ownerDocument ?? document
    this.isInitialized = false
    this.openedModal = null
    this.previouslyFocused = null
    this.modals = new Map()
    this.openButtons = []
    this.onOpenClicks = []
    this.onDocumentKeyDown = this.onDocumentKeyDown.bind(this)
  }

  init() {
    if (this.isInitialized) return

    const modalRoots = this.root.querySelectorAll(SELECTORS.modal.root)
    modalRoots.forEach(root => {
      const name = root.getAttribute(ATTRIBUTES.modalName)
      const dialog = root.querySelector(SELECTORS.modal.dialog)
      const form = root.querySelector(SELECTORS.modal.form)
      if (!name || !dialog) return
      if (!dialog.hasAttribute(ATTRIBUTES.tabindex)) {
        dialog.setAttribute(ATTRIBUTES.tabindex, '-1')
      }

      const entry = {
        name,
        root,
        dialog,
        form,
        success: root.querySelector(SELECTORS.modal.success),
        successTitle: root.querySelector(SELECTORS.modal.successTitle),
        successReset: root.querySelector(SELECTORS.modal.successReset),
        isSuccess: false,
        onRootClick: null,
        onFormSubmit: null,
        onResetClick: null,
        closeGuardTimeoutId: null,
        onCloseTransitionEnd: null,
        opener: null,
      }

      entry.onRootClick = event => {
        const closeTarget = event.target.closest(SELECTORS.modal.close)
        if (!closeTarget || !root.contains(closeTarget)) return
        event.preventDefault()
        this.close(name)
      }

      root.addEventListener('click', entry.onRootClick)

      // Demo-only submit: data is never sent (no fetch/XHR/mailto/storage) and
      // navigation is always prevented. A valid submit swaps the form for the
      // in-modal success state. Required native fields gate the submit event;
      // required custom selects run their own (earlier-registered) submit
      // handler and preventDefault when empty — so a blocked event means invalid.
      entry.onFormSubmit = event => {
        const blockedByRequiredField = event.defaultPrevented
        event.preventDefault()
        if (blockedByRequiredField) return
        if (form && !form.checkValidity()) {
          form.reportValidity()
          return
        }
        this.showSuccess(entry)
      }

      form?.addEventListener('submit', entry.onFormSubmit)

      if (entry.successReset) {
        entry.onResetClick = event => {
          event.preventDefault()
          this.restoreFormView(entry)
          this.focusFirstField(entry)
        }
        entry.successReset.addEventListener('click', entry.onResetClick)
      }

      root.classList.remove(CLASSES.isOpen, CLASSES.isClosing, CLASSES.isSuccess)
      root.setAttribute(ATTRIBUTES.hidden, '')

      this.modals.set(name, entry)
    })

    this.openButtons = Array.from(this.root.querySelectorAll(SELECTORS.modal.open))
    this.openButtons.forEach(button => {
      const onClick = event => {
        event.preventDefault()
        const targetName = button.getAttribute(ATTRIBUTES.modalOpen)
        if (!targetName) return
        this.open(targetName, button)
      }

      button.addEventListener('click', onClick)
      this.onOpenClicks.push(onClick)
    })

    this.document.addEventListener('keydown', this.onDocumentKeyDown)
    this.isInitialized = true
  }

  destroy() {
    this.closeCurrent({ restoreFocus: false, immediate: true })

    this.modals.forEach(entry => {
      this.cleanupClosing(entry)
      entry.root.removeEventListener('click', entry.onRootClick)
      entry.form?.removeEventListener('submit', entry.onFormSubmit)
      entry.successReset?.removeEventListener('click', entry.onResetClick)
    })

    this.openButtons.forEach((button, index) => {
      button.removeEventListener('click', this.onOpenClicks[index])
    })

    this.document.removeEventListener('keydown', this.onDocumentKeyDown)

    this.modals.clear()
    this.openButtons = []
    this.onOpenClicks = []
    this.previouslyFocused = null
    this.isInitialized = false
    this.unlockBodyScroll()
  }

  open(name, opener = null) {
    const entry = this.modals.get(name)
    if (!entry) return

    if (this.openedModal && this.openedModal !== entry) {
      this.closeCurrent({ restoreFocus: false, immediate: true })
    }

    if (this.openedModal === entry && entry.root.classList.contains(CLASSES.isOpen)) return

    this.cleanupClosing(entry)
    this.previouslyFocused = this.document.activeElement instanceof HTMLElement
      ? this.document.activeElement
      : null
    entry.opener = opener

    entry.root.removeAttribute(ATTRIBUTES.hidden)
    entry.root.classList.remove(CLASSES.isClosing)
    entry.root.classList.add(CLASSES.isOpen)

    this.lockBodyScroll()
    this.openedModal = entry

    focusFirstIn(entry.dialog, entry.dialog)
  }

  close(name, { restoreFocus = true, immediate = false } = {}) {
    const entry = this.modals.get(name)
    if (!entry) return

    if (!entry.root.classList.contains(CLASSES.isOpen) && !entry.root.classList.contains(CLASSES.isClosing)) return

    this.cleanupClosing(entry)
    entry.root.classList.remove(CLASSES.isOpen)

    const finalizeClose = () => {
      entry.root.classList.remove(CLASSES.isClosing)
      entry.root.setAttribute(ATTRIBUTES.hidden, '')
      this.cleanupClosing(entry)

      // Once hidden, drop any success view so the next open shows the form again.
      // Fields were already cleared at submit time; a non-success close keeps the
      // user's typed input untouched (no reset here).
      if (entry.isSuccess) this.restoreFormView(entry)

      if (this.openedModal === entry) {
        this.openedModal = null
        this.unlockBodyScroll()
      }

      if (!restoreFocus) return
      const restoreTarget =
        (entry.opener && this.document.contains(entry.opener) && entry.opener) ||
        (this.previouslyFocused && this.document.contains(this.previouslyFocused) && this.previouslyFocused) ||
        null

      restoreTarget?.focus()
    }

    if (immediate) {
      finalizeClose()
      return
    }

    entry.root.classList.add(CLASSES.isClosing)

    entry.onCloseTransitionEnd = event => {
      if (event.target !== entry.dialog) return
      finalizeClose()
    }

    entry.dialog.addEventListener('transitionend', entry.onCloseTransitionEnd, { once: true })

    entry.closeGuardTimeoutId = window.setTimeout(() => {
      if (entry.root.hasAttribute(ATTRIBUTES.hidden)) return
      finalizeClose()
    }, CLOSE_GUARD_TIMEOUT_MS)
  }

  closeCurrent(options = {}) {
    if (!this.openedModal) return
    this.close(this.openedModal.name, options)
  }

  showSuccess(entry) {
    if (!entry.success) return

    // Clear the fields after a successful demo submit. `form.reset()` fires a
    // native `reset` event the Select and CharCounter modules listen to, so the
    // custom selects and counter re-sync to their empty state too.
    entry.form?.reset()

    entry.success.removeAttribute(ATTRIBUTES.hidden)
    entry.root.classList.add(CLASSES.isSuccess)
    entry.isSuccess = true

    // Move focus into the confirmation (role="status" title, tabindex="-1").
    entry.successTitle?.focus()
  }

  restoreFormView(entry) {
    if (!entry.success) return

    entry.success.setAttribute(ATTRIBUTES.hidden, '')
    entry.root.classList.remove(CLASSES.isSuccess)
    entry.isSuccess = false
  }

  focusFirstField(entry) {
    const field = entry.form?.querySelector(
      'input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), [data-js-select-trigger]',
    )
    field?.focus()
  }

  onDocumentKeyDown(event) {
    if (!this.openedModal) return

    if (event.key === KEYS.Escape) {
      event.preventDefault()
      this.closeCurrent()
      return
    }

    trapFocus(event, this.openedModal.dialog, this.openedModal.dialog)
  }

  lockBodyScroll() {
    lockBodyScroll(this.document)
  }

  unlockBodyScroll() {
    unlockBodyScroll(this.document)
  }

  cleanupClosing(entry) {
    if (entry.onCloseTransitionEnd) {
      entry.dialog.removeEventListener('transitionend', entry.onCloseTransitionEnd)
      entry.onCloseTransitionEnd = null
    }

    if (entry.closeGuardTimeoutId) {
      window.clearTimeout(entry.closeGuardTimeoutId)
      entry.closeGuardTimeoutId = null
    }
  }
}
