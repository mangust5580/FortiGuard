import Accordion from './modules/accordion.js'
import Alert from './modules/alert.js'
import CharCounter from './modules/char-counter.js'
import HeaderCurrentPage from './modules/header-current-page.js'
import HeaderScroll from './modules/header-scroll.js'
import HistoryBack from './modules/history-back.js'
import InputMask from './modules/input-mask.js'
import InputModality from './modules/input-modality.js'
import Modal from './modules/modal.js'
import OverlayMenu from './modules/overlay-menu.js'
import Scrollspy from './modules/scrollspy.js'
import Select from './modules/select.js'

class App {
  constructor(root = document) {
    this.root = root
    this.modules = [
      new InputModality(this.root),
      new HeaderCurrentPage(this.root),
      new HeaderScroll(this.root),
      new HistoryBack(this.root),
      new Select(this.root),
      new InputMask(this.root),
      new CharCounter(this.root),
      new Alert(this.root),
      new Accordion(this.root),
      new Modal(this.root),
      new OverlayMenu(this.root),
      new Scrollspy(this.root),
    ]
  }

  init() {
    this.modules.forEach(module => module.init())
  }

  destroy() {
    this.modules.forEach(module => module.destroy())
  }
}

const app = new App(document)

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => app.init(), { once: true })
} else {
  app.init()
}

window.addEventListener('beforeunload', () => app.destroy(), { once: true })
