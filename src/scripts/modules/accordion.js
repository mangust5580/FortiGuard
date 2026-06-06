import { ATTRIBUTES, CLASSES, KEYS } from '../config/constants.js'
import { SELECTORS } from '../config/selectors.js'

const MODE_MULTIPLE = 'multiple'
const MODE_SINGLE = 'single'

export default class Accordion {
  constructor(root = document) {
    this.root = root
    this.instances = []
    this.itemIdCounter = 0
    this.isInitialized = false
  }

  init() {
    if (this.isInitialized) return

    const roots = this.root.querySelectorAll(SELECTORS.accordion.root)

    roots.forEach(root => {
      const items = Array.from(root.querySelectorAll(SELECTORS.accordion.item))
      if (items.length === 0) return

      const instance = {
        root,
        mode: this.resolveMode(root),
        items: [],
      }

      items.forEach((item, index) => {
        const trigger = item.querySelector(SELECTORS.accordion.trigger)
        const panel = item.querySelector(SELECTORS.accordion.panel)
        if (!trigger || !panel) return

        this.ensureIds(instance, trigger, panel, index)

        const onTriggerClick = () => this.toggle(instance, item)
        const onTriggerKeyDown = event => this.onKeyDown(event, instance, item)

        trigger.addEventListener('click', onTriggerClick)
        trigger.addEventListener('keydown', onTriggerKeyDown)

        instance.items.push({
          item,
          trigger,
          panel,
          onTriggerClick,
          onTriggerKeyDown,
        })
      })

      if (instance.items.length === 0) return

      this.syncInitialState(instance)
      this.instances.push(instance)
    })

    this.isInitialized = true
  }

  destroy() {
    this.instances.forEach(instance => {
      instance.items.forEach(entry => {
        entry.trigger.removeEventListener('click', entry.onTriggerClick)
        entry.trigger.removeEventListener('keydown', entry.onTriggerKeyDown)
      })
    })

    this.instances = []
    this.isInitialized = false
  }

  resolveMode(root) {
    const mode = root.getAttribute(ATTRIBUTES.accordionMode)
    return mode === MODE_MULTIPLE ? MODE_MULTIPLE : MODE_SINGLE
  }

  ensureIds(instance, trigger, panel, index) {
    if (!trigger.getAttribute(ATTRIBUTES.id)) {
      trigger.setAttribute(ATTRIBUTES.id, `accordion-trigger-${this.itemIdCounter}-${index}`)
    }

    if (!panel.getAttribute(ATTRIBUTES.id)) {
      panel.setAttribute(ATTRIBUTES.id, `accordion-panel-${this.itemIdCounter}-${index}`)
    }

    trigger.setAttribute(ATTRIBUTES.ariaControls, panel.getAttribute(ATTRIBUTES.id))
    panel.setAttribute(ATTRIBUTES.ariaLabelledby, trigger.getAttribute(ATTRIBUTES.id))
    this.itemIdCounter += 1
  }

  syncInitialState(instance) {
    const openEntries = instance.items.filter(({ item, trigger }) => {
      return (
        item.classList.contains(CLASSES.isOpen) ||
        trigger.getAttribute(ATTRIBUTES.ariaExpanded) === 'true'
      )
    })

    if (instance.mode === MODE_SINGLE && openEntries.length > 1) {
      const firstOpen = openEntries[0]
      instance.items.forEach(entry => this.setOpen(entry, entry === firstOpen))
      return
    }

    if (openEntries.length === 0 && instance.mode === MODE_SINGLE) {
      instance.items.forEach(entry => this.setOpen(entry, false))
      return
    }

    instance.items.forEach(entry => {
      this.setOpen(entry, openEntries.includes(entry))
    })
  }

  toggle(instance, itemElement) {
    const entry = instance.items.find(({ item }) => item === itemElement)
    if (!entry) return

    const nextOpen = !entry.item.classList.contains(CLASSES.isOpen)

    if (nextOpen && instance.mode === MODE_SINGLE) {
      instance.items.forEach(current => this.setOpen(current, current === entry))
      return
    }

    this.setOpen(entry, nextOpen)
  }

  setOpen(entry, isOpen) {
    entry.item.classList.toggle(CLASSES.isOpen, isOpen)
    entry.trigger.setAttribute(ATTRIBUTES.ariaExpanded, String(isOpen))
  }

  onKeyDown(event, instance, itemElement) {
    const currentIndex = instance.items.findIndex(({ item }) => item === itemElement)
    if (currentIndex < 0) return

    const { key } = event

    if (key === KEYS.ArrowDown || key === KEYS.ArrowUp) {
      event.preventDefault()
      const direction = key === KEYS.ArrowDown ? 1 : -1
      const nextIndex = (currentIndex + direction + instance.items.length) % instance.items.length
      instance.items[nextIndex].trigger.focus()
      return
    }

    if (key === KEYS.Home || key === KEYS.End) {
      event.preventDefault()
      const targetIndex = key === KEYS.Home ? 0 : instance.items.length - 1
      instance.items[targetIndex].trigger.focus()
      return
    }

    if (key === KEYS.Escape) {
      const entry = instance.items[currentIndex]
      if (!entry.item.classList.contains(CLASSES.isOpen)) return
      event.preventDefault()
      this.setOpen(entry, false)
    }
  }
}
