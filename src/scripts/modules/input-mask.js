import { SELECTORS } from '../config/selectors.js'

const COUNTRY_PREFIX = '+7'
const NATIONAL_LENGTH = 10

// Reduce raw input to the national 10-digit part, dropping a leading 7/8 country code.
const toNationalDigits = raw => {
  let digits = raw.replace(/\D/g, '')
  if (digits.startsWith('8') || digits.startsWith('7')) digits = digits.slice(1)
  return digits.slice(0, NATIONAL_LENGTH)
}

// Build "+7 (XXX) XXX-XX-XX", revealing only as many groups as there are digits.
const formatPhone = national => {
  if (!national) return ''

  let result = `${COUNTRY_PREFIX} (${national.slice(0, 3)}`
  if (national.length >= 3) result += ')'
  if (national.length > 3) result += ` ${national.slice(3, 6)}`
  if (national.length > 6) result += `-${national.slice(6, 8)}`
  if (national.length > 8) result += `-${national.slice(8, 10)}`
  return result
}

export default class InputMask {
  constructor(root = document) {
    this.root = root
    this.instances = []
    this.isInitialized = false
  }

  init() {
    if (this.isInitialized) return

    const inputs = this.root.querySelectorAll(SELECTORS.inputMask.phone)

    inputs.forEach(input => {
      const entry = { input, previous: '' }
      entry.onInput = event => this.format(entry, event)

      input.addEventListener('input', entry.onInput)
      this.format(entry) // normalize any prefilled / autofilled value
      this.instances.push(entry)
    })

    this.isInitialized = true
  }

  destroy() {
    this.instances.forEach(entry => entry.input.removeEventListener('input', entry.onInput))
    this.instances = []
    this.isInitialized = false
  }

  format(entry, event) {
    const { input } = entry
    let national = toNationalDigits(input.value)

    // A backspace that only erased a formatting char (e.g. ")") would have it
    // re-added on reformat, freezing the caret. Drop one more digit so deletion
    // keeps progressing.
    if (event?.inputType === 'deleteContentBackward' && formatPhone(national) === entry.previous) {
      national = national.slice(0, -1)
    }

    const formatted = formatPhone(national)
    input.value = formatted
    entry.previous = formatted

    if (input.ownerDocument.activeElement === input) {
      const caret = formatted.length
      input.setSelectionRange(caret, caret)
    }
  }
}