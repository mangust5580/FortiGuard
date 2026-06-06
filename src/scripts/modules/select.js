import { ATTRIBUTES, CLASSES, KEYS, ROLES } from '../config/constants.js'
import { SELECTORS } from '../config/selectors.js'

const SELECT_REQUIRED_MESSAGE = 'Выберите значение'

const isAriaDisabled = el => el?.getAttribute(ATTRIBUTES.ariaDisabled) === 'true'
const isOptionDisabled = option => option.disabled || isAriaDisabled(option)
const isSelectRequired = root => root.hasAttribute(ATTRIBUTES.selectRequired)
const canScroll = el => el && el.scrollHeight > el.clientHeight
const isScrollableY = el => {
  const { overflowY } = window.getComputedStyle(el)
  return /(auto|scroll|overlay)/.test(overflowY)
}

export default class Select {
  constructor(root = document) {
    this.root = root
    this.document = root?.ownerDocument ?? document
    this.instances = []
    this.onDocumentPointerDown = this.onDocumentPointerDown.bind(this)
    this.instanceId = 0
    this.isInitialized = false
  }

  init() {
    if (this.isInitialized) return

    const roots = this.root.querySelectorAll(SELECTORS.select.root)

    roots.forEach(root => {
      const trigger = root.querySelector(SELECTORS.select.trigger)
      const value = root.querySelector(SELECTORS.select.value)
      const dropdown = root.querySelector(SELECTORS.select.dropdown)
      const input = root.querySelector(SELECTORS.select.input)
      const options = Array.from(root.querySelectorAll(SELECTORS.select.option))

      if (!trigger || !value || !dropdown || options.length === 0) return

      const instance = {
        root,
        trigger,
        value,
        dropdown,
        input,
        options,
        activeIndex: -1,
        isRequired: isSelectRequired(root),
        form: root.closest('form'),
        // The initial value text is the placeholder; kept so a form reset can
        // restore it after a selection has overwritten it.
        placeholder: value.textContent.trim(),
        onTriggerClick: null,
        onRootKeyDown: null,
        onFormSubmit: null,
        onFormReset: null,
        onOptionClicks: [],
      }

      this.setupA11y(instance)

      instance.onTriggerClick = () => {
        if (this.isDisabled(instance)) return
        this.toggle(instance)
      }

      instance.onRootKeyDown = event => {
        this.onKeyDown(event, instance)
      }

      instance.onFormSubmit = event => {
        if (event.defaultPrevented) {
          this.validate(instance)
          return
        }

        if (this.validate(instance)) return

        event.preventDefault()
        this.open(instance)
        instance.trigger.focus()
      }

      instance.onFormReset = () => {
        this.resetInstance(instance)
      }

      trigger.addEventListener('click', instance.onTriggerClick)
      root.addEventListener('keydown', instance.onRootKeyDown)
      instance.form?.addEventListener('submit', instance.onFormSubmit)
      instance.form?.addEventListener('reset', instance.onFormReset)

      options.forEach((option, index) => {
        const onOptionClick = event => {
          event.preventDefault()
          if (this.isDisabled(instance) || isOptionDisabled(option)) return
          this.selectIndex(instance, index)
          this.close(instance, { focusTrigger: true })
        }

        option.addEventListener('click', onOptionClick)
        instance.onOptionClicks.push(onOptionClick)
      })

      this.setupInitialSelection(instance)
      this.close(instance)
      this.instances.push(instance)
    })

    this.document.addEventListener('pointerdown', this.onDocumentPointerDown)
    this.isInitialized = true
  }

  destroy() {
    this.instances.forEach(instance => {
      instance.trigger.removeEventListener('click', instance.onTriggerClick)
      instance.root.removeEventListener('keydown', instance.onRootKeyDown)
      instance.form?.removeEventListener('submit', instance.onFormSubmit)
      instance.form?.removeEventListener('reset', instance.onFormReset)

      instance.options.forEach((option, index) => {
        option.removeEventListener('click', instance.onOptionClicks[index])
      })
    })

    this.document.removeEventListener('pointerdown', this.onDocumentPointerDown)

    this.instances = []
    this.isInitialized = false
  }

  ensureId(element, prefix) {
    if (element.id) return element.id

    this.instanceId += 1
    const id = `${prefix}-${this.instanceId}`
    element.id = id
    return id
  }

  setupA11y(instance) {
    const { root, trigger, dropdown, options, isRequired } = instance
    const rootId = this.ensureId(root, 'select')
    const dropdownId = this.ensureId(dropdown, `${rootId}-listbox`)

    trigger.setAttribute(ATTRIBUTES.ariaHaspopup, ROLES.listbox)
    trigger.setAttribute(ATTRIBUTES.ariaControls, dropdownId)
    trigger.setAttribute(ATTRIBUTES.ariaExpanded, 'false')
    trigger.setAttribute(ATTRIBUTES.ariaInvalid, 'false')
    dropdown.setAttribute(ATTRIBUTES.role, ROLES.listbox)

    if (isRequired) {
      trigger.setAttribute(ATTRIBUTES.ariaRequired, 'true')
    }

    options.forEach((option, index) => {
      this.ensureId(option, `${rootId}-option-${index + 1}`)
      option.setAttribute(ATTRIBUTES.role, ROLES.option)

      if (!option.hasAttribute(ATTRIBUTES.ariaSelected)) {
        option.setAttribute(ATTRIBUTES.ariaSelected, 'false')
      }
    })
  }

  isDisabled(instance) {
    return (
      instance.trigger.disabled ||
      instance.root.classList.contains(CLASSES.selectDisabled) ||
      isAriaDisabled(instance.root) ||
      isAriaDisabled(instance.trigger)
    )
  }

  setupInitialSelection(instance) {
    const byInputValue = instance.input?.value
      ? instance.options.find(option => option.dataset.value === instance.input.value)
      : null
    const byClass = instance.options.find(option => option.classList.contains(CLASSES.isSelected))
    const byAria = instance.options.find(option => option.getAttribute(ATTRIBUTES.ariaSelected) === 'true')
    const initial = byInputValue ?? byClass ?? byAria

    if (!initial) return
    const index = instance.options.indexOf(initial)
    if (index >= 0) this.selectIndex(instance, index, { silent: true })
  }

  toggle(instance) {
    if (instance.root.classList.contains(CLASSES.isOpen)) {
      this.close(instance, { focusTrigger: true })
      return
    }

    this.open(instance)
  }

  open(instance) {
    if (this.isDisabled(instance)) return

    this.closeAll(instance)
    instance.root.classList.add(CLASSES.isOpen)
    instance.trigger.setAttribute(ATTRIBUTES.ariaExpanded, 'true')

    const selectedIndex = instance.options.findIndex(option =>
      option.classList.contains(CLASSES.isSelected),
    )
    const fallbackIndex = instance.options.findIndex(option => !isOptionDisabled(option))
    const nextIndex = selectedIndex >= 0 ? selectedIndex : fallbackIndex

    this.setActiveIndex(instance, nextIndex)
    this.ensureDropdownVisible(instance)
  }

  close(instance, { focusTrigger = false } = {}) {
    instance.root.classList.remove(CLASSES.isOpen)
    instance.trigger.setAttribute(ATTRIBUTES.ariaExpanded, 'false')
    this.setActiveIndex(instance, -1)

    if (focusTrigger) instance.trigger.focus()
  }

  closeAll(except = null) {
    this.instances.forEach(instance => {
      if (instance === except) return
      this.close(instance)
    })
  }

  validate(instance) {
    if (!instance.isRequired) return true

    const isValid = Boolean(instance.input?.value)
    instance.root.classList.toggle(CLASSES.selectError, !isValid)
    instance.trigger.setAttribute(ATTRIBUTES.ariaInvalid, String(!isValid))

    if (instance.input) {
      instance.input.setCustomValidity(isValid ? '' : SELECT_REQUIRED_MESSAGE)
    }

    return isValid
  }

  clearError(instance) {
    instance.root.classList.remove(CLASSES.selectError)
    instance.trigger.setAttribute(ATTRIBUTES.ariaInvalid, 'false')
    instance.input?.setCustomValidity('')
  }

  // Restore the select to its empty/placeholder state — used on form reset so the
  // visible value matches the (native-reset) hidden input after a demo submit.
  resetInstance(instance) {
    instance.options.forEach(option => {
      option.classList.remove(CLASSES.isSelected)
      option.setAttribute(ATTRIBUTES.ariaSelected, 'false')
    })

    instance.value.textContent = instance.placeholder

    if (instance.input) instance.input.value = ''

    this.clearError(instance)
    this.close(instance)
  }

  selectIndex(instance, index, { silent = false } = {}) {
    const option = instance.options[index]
    if (!option || isOptionDisabled(option)) return

    instance.options.forEach(opt => {
      opt.classList.remove(CLASSES.isSelected)
      opt.setAttribute(ATTRIBUTES.ariaSelected, 'false')
    })

    option.classList.add(CLASSES.isSelected)
    option.setAttribute(ATTRIBUTES.ariaSelected, 'true')

    const label = option.textContent?.trim() ?? ''
    instance.value.textContent = label

    if (instance.input) {
      instance.input.value = option.dataset.value ?? label
      if (!silent) instance.input.dispatchEvent(new Event('change', { bubbles: true }))
    }

    this.clearError(instance)
  }

  setActiveIndex(instance, index) {
    instance.options.forEach(option => option.classList.remove(CLASSES.isActive))
    instance.activeIndex = index

    if (index < 0) {
      instance.trigger.removeAttribute(ATTRIBUTES.ariaActivedescendant)
      return
    }

    const option = instance.options[index]
    if (!option) return

    option.classList.add(CLASSES.isActive)
    instance.trigger.setAttribute(ATTRIBUTES.ariaActivedescendant, option.id)
    option.scrollIntoView({ block: 'nearest' })
  }

  moveActive(instance, step) {
    const enabled = instance.options
      .map((option, index) => ({ option, index }))
      .filter(({ option }) => !isOptionDisabled(option))

    if (enabled.length === 0) return

    const current = enabled.findIndex(({ index }) => index === instance.activeIndex)
    const nextPosition = current < 0 ? 0 : (current + step + enabled.length) % enabled.length
    this.setActiveIndex(instance, enabled[nextPosition].index)
    this.ensureDropdownVisible(instance)
  }

  moveEdge(instance, isEnd) {
    const enabled = instance.options
      .map((option, index) => ({ option, index }))
      .filter(({ option }) => !isOptionDisabled(option))
    if (enabled.length === 0) return
    const target = isEnd ? enabled[enabled.length - 1] : enabled[0]
    this.setActiveIndex(instance, target.index)
    this.ensureDropdownVisible(instance)
  }

  getScrollableParent(element) {
    let current = element.parentElement

    while (current && current !== this.document.body) {
      if (isScrollableY(current) && canScroll(current)) return current
      current = current.parentElement
    }

    const scrollingElement = this.document.scrollingElement || this.document.documentElement
    return canScroll(scrollingElement) ? scrollingElement : null
  }

  ensureDropdownVisible(instance) {
    window.requestAnimationFrame(() => {
      if (!instance.root.classList.contains(CLASSES.isOpen)) return

      const scrollContainer = this.getScrollableParent(instance.root)
      if (!scrollContainer) return

      const dropdownRect = instance.dropdown.getBoundingClientRect()
      const containerRect = scrollContainer === this.document.scrollingElement
        ? { top: 0, bottom: window.innerHeight || this.document.documentElement.clientHeight }
        : scrollContainer.getBoundingClientRect()
      const margin = 8
      const overflowBottom = dropdownRect.bottom - containerRect.bottom + margin
      const overflowTop = containerRect.top - dropdownRect.top + margin

      if (overflowBottom > 0) {
        scrollContainer.scrollTop += overflowBottom
        return
      }

      if (overflowTop > 0) {
        scrollContainer.scrollTop -= overflowTop
      }
    })
  }

  onKeyDown(event, instance) {
    if (this.isDisabled(instance)) return

    const isOpen = instance.root.classList.contains(CLASSES.isOpen)
    const { key } = event

    if (key === KEYS.Tab) {
      if (isOpen) this.close(instance)
      return
    }

    if (key === KEYS.Escape) {
      if (!isOpen) return
      event.preventDefault()
      this.close(instance, { focusTrigger: true })
      return
    }

    if (key === KEYS.ArrowDown || key === KEYS.ArrowUp) {
      event.preventDefault()
      if (!isOpen) {
        this.open(instance)
        return
      }

      this.moveActive(instance, key === KEYS.ArrowDown ? 1 : -1)
      return
    }

    if (key === KEYS.Home || key === KEYS.End) {
      if (!isOpen) return
      event.preventDefault()
      this.moveEdge(instance, key === KEYS.End)
      return
    }

    if (key === KEYS.Enter || key === KEYS.Space) {
      event.preventDefault()
      if (!isOpen) {
        this.open(instance)
        return
      }

      if (instance.activeIndex >= 0) {
        this.selectIndex(instance, instance.activeIndex)
      }
      this.close(instance, { focusTrigger: true })
    }
  }

  onDocumentPointerDown(event) {
    const target = event.target

    this.instances.forEach(instance => {
      if (!instance.root.classList.contains(CLASSES.isOpen)) return
      if (instance.root.contains(target)) return
      this.close(instance)
    })
  }
}
