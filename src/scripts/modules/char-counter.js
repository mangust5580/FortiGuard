import { ATTRIBUTES } from '../config/constants.js'
import { SELECTORS } from '../config/selectors.js'

// Usage thresholds (% of maxlength) at which the counter flips state.
const USAGE_DANGER = 95
const USAGE_WARNING = 80

const parseMaxLength = input => {
  const raw = input.getAttribute(ATTRIBUTES.maxLength)
  const parsed = Number.parseInt(raw ?? '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

const resolveState = usagePercent => {
  if (usagePercent >= USAGE_DANGER) return 'danger'
  if (usagePercent >= USAGE_WARNING) return 'warning'
  return 'normal'
}

export default class CharCounter {
  constructor(root = document) {
    this.root = root
    this.instances = []
    this.isInitialized = false
  }

  init() {
    if (this.isInitialized) return

    const roots = this.root.querySelectorAll(SELECTORS.charCounter.root)
    roots.forEach(root => {
      const input = root.querySelector(SELECTORS.charCounter.input)
      const output = root.querySelector(SELECTORS.charCounter.output)

      if (!input || !output) return

      const max = parseMaxLength(input)
      if (!max) return

      const instance = {
        input,
        output,
        max,
        form: input.closest('form'),
        onInput: null,
        onFormReset: null,
      }

      instance.onInput = () => {
        this.render(instance)
      }

      // A native form reset clears the field after this event fires, so re-render
      // on the next microtask to reflect the emptied value.
      instance.onFormReset = () => {
        Promise.resolve().then(() => this.render(instance))
      }

      input.addEventListener('input', instance.onInput)
      instance.form?.addEventListener('reset', instance.onFormReset)
      this.render(instance)
      this.instances.push(instance)
    })

    this.isInitialized = true
  }

  destroy() {
    this.instances.forEach(instance => {
      instance.input.removeEventListener('input', instance.onInput)
      instance.form?.removeEventListener('reset', instance.onFormReset)
    })

    this.instances = []
    this.isInitialized = false
  }

  render(instance) {
    const length = instance.input.value.length
    const normalized = Math.min(length, instance.max)
    const usage = (normalized / instance.max) * 100

    instance.output.dataset.state = resolveState(usage)
    instance.output.textContent = `${normalized}/${instance.max}`
  }
}
