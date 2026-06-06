import { CLASSES, KEYS } from '../config/constants.js'

export default class InputModality {
  constructor(root = document) {
    this.document = root?.ownerDocument ?? document
    this.documentElement = this.document?.documentElement ?? null
    this.isInitialized = false
    this.onDocumentKeyDown = this.onDocumentKeyDown.bind(this)
    this.onDocumentPointerDown = this.onDocumentPointerDown.bind(this)
  }

  init() {
    if (this.isInitialized || !this.documentElement) return

    this.document.addEventListener('keydown', this.onDocumentKeyDown)
    this.document.addEventListener('pointerdown', this.onDocumentPointerDown, true)
    this.document.addEventListener('touchstart', this.onDocumentPointerDown, { passive: true, capture: true })
    this.isInitialized = true
  }

  destroy() {
    if (!this.isInitialized || !this.documentElement) return

    this.document.removeEventListener('keydown', this.onDocumentKeyDown)
    this.document.removeEventListener('pointerdown', this.onDocumentPointerDown, true)
    this.document.removeEventListener('touchstart', this.onDocumentPointerDown, true)
    this.documentElement.classList.remove(CLASSES.isKeyboardNavigation)
    this.isInitialized = false
  }

  onDocumentKeyDown(event) {
    if (event.key !== KEYS.Tab) return
    this.documentElement?.classList.add(CLASSES.isKeyboardNavigation)
  }

  onDocumentPointerDown() {
    this.documentElement?.classList.remove(CLASSES.isKeyboardNavigation)
  }
}
