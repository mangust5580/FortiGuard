export const SELECTORS = {
  header: {
    root: '.header',
    navLink: '[data-js-nav-link]',
  },
  overlayMenu: {
    root: '[data-js-overlay-menu]',
    burgerButton: '[data-js-overlay-menu-burger-button]',
    panel: '[data-js-overlay-menu-panel]',
    close: '[data-js-overlay-menu-close]',
  },
  modal: {
    root: '[data-js-modal]',
    open: '[data-js-modal-open]',
    close: '[data-js-modal-close]',
    dialog: '[data-js-modal-dialog]',
    form: '[data-js-modal-form]',
    success: '[data-js-modal-success]',
    successTitle: '[data-js-modal-success-title]',
    successReset: '[data-js-modal-success-reset]',
  },
  inputMask: {
    phone: '[data-js-input-mask="phone"]',
  },
  charCounter: {
    root: '[data-js-char-counter]',
    input: '[data-js-char-counter-input]',
    output: '[data-js-char-counter-output]',
  },
  accordion: {
    root: '[data-js-accordion]',
    item: '[data-js-accordion-item]',
    trigger: '[data-js-accordion-trigger]',
    panel: '[data-js-accordion-panel]',
  },
  alert: {
    root: '[data-js-alert]',
    close: '[data-js-alert-close]',
  },
  historyBack: {
    root: '[data-js-history-back]',
  },
  select: {
    root: '[data-js-select]',
    trigger: '[data-js-select-trigger]',
    value: '[data-js-select-value]',
    dropdown: '[data-js-select-dropdown]',
    option: '[data-js-select-option]',
    input: '[data-js-select-input]',
  },
  scrollspy: {
    root: '[data-js-scrollspy]',
    link: '.legal-toc__link',
    item: '.legal-toc__item',
  },
}
