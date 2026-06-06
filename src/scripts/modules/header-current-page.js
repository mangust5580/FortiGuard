import { ATTRIBUTES, CLASSES } from '../config/constants.js'
import { SELECTORS } from '../config/selectors.js'

const HOME_PAGE = 'home'
const HOME_FILE = 'index.html'
const ARTICLE_SECTION_HASH = '#articles'
const ARIA_CURRENT_PAGE = 'page'
const ARIA_CURRENT_LOCATION = 'location'
const SCROLL_SETTLE_MS = 600
const BOTTOM_EDGE_THRESHOLD_PX = 2
const ACTIVATION_LINE_RATIO = 0.3

const ARTICLE_PAGES = new Set(['articles', 'article'])

export default class HeaderCurrentPage {
  constructor(root = document) {
    this.root = root
    this.document = root?.ownerDocument ?? document
    this.window = this.document?.defaultView ?? window
    this.header = null
    this.links = []
    this.sectionEntries = []
    this.isInitialized = false
    this.lockedUntil = 0
    this.isScrollQueued = false
    this.onLinkClick = this.onLinkClick.bind(this)
    this.onHashChange = this.onHashChange.bind(this)
    this.onScroll = this.onScroll.bind(this)
    this.onResize = this.onResize.bind(this)
  }

  init() {
    if (this.isInitialized) return

    this.header = this.root.querySelector(SELECTORS.header.root)
    if (!this.header) return

    this.links = Array.from(this.header.querySelectorAll(SELECTORS.header.navLink))
    if (this.links.length === 0) return

    this.links.forEach(link => link.addEventListener('click', this.onLinkClick))
    this.sectionEntries = this.collectSectionEntries()

    this.window.addEventListener('hashchange', this.onHashChange)

    if (this.isHomePage() && this.sectionEntries.length > 0) {
      this.window.addEventListener('scroll', this.onScroll, { passive: true })
      this.window.addEventListener('resize', this.onResize)
    }

    this.sync()
    this.isInitialized = true
  }

  destroy() {
    this.links.forEach(link => link.removeEventListener('click', this.onLinkClick))
    this.window.removeEventListener('hashchange', this.onHashChange)
    this.window.removeEventListener('scroll', this.onScroll)
    this.window.removeEventListener('resize', this.onResize)
    this.clearActive()
    this.header = null
    this.links = []
    this.sectionEntries = []
    this.lockedUntil = 0
    this.isScrollQueued = false
    this.isInitialized = false
  }

  collectSectionEntries() {
    if (!this.isHomePage()) return []

    return this.links
      .map(link => {
        const linkUrl = this.resolveUrl(link)
        if (!linkUrl || !this.isIndexFile(linkUrl) || !linkUrl.hash) return null

        const section = this.document.getElementById(decodeURIComponent(linkUrl.hash.slice(1)))
        return section ? { link, section, hash: linkUrl.hash } : null
      })
      .filter(Boolean)
  }

  onLinkClick(event) {
    const link = event.currentTarget
    const linkUrl = this.resolveUrl(link)
    if (!linkUrl) return

    if (this.isHomePage() && this.isIndexFile(linkUrl)) {
      this.lockedUntil = this.now() + SCROLL_SETTLE_MS
      this.setActive(link, linkUrl.hash ? ARIA_CURRENT_LOCATION : ARIA_CURRENT_PAGE)
      return
    }

    if (this.isArticlePageLink(linkUrl)) {
      this.setActive(link, ARIA_CURRENT_PAGE)
    }
  }

  onHashChange() {
    this.sync()
  }

  onScroll() {
    if (!this.isHomePage() || this.now() < this.lockedUntil || this.isScrollQueued) return

    this.isScrollQueued = true
    this.window.requestAnimationFrame(() => {
      this.isScrollQueued = false
      if (this.now() < this.lockedUntil) return
      this.syncHomeFromScroll()
    })
  }

  onResize() {
    this.sync()
  }

  sync() {
    if (this.isHomePage()) {
      this.syncHome()
      return
    }

    this.syncInnerPage()
  }

  syncHome() {
    const hash = this.window.location.hash
    const hashEntry = hash
      ? this.sectionEntries.find(entry => entry.hash === hash)
      : null

    if (hashEntry) {
      this.setActive(hashEntry.link, ARIA_CURRENT_LOCATION)
      return
    }

    this.syncHomeFromScroll()
  }

  syncHomeFromScroll() {
    if (this.isScrolledToBottom()) {
      const lastEntry = this.sectionEntries[this.sectionEntries.length - 1]
      this.setActive(lastEntry?.link ?? this.getHomeLink(), lastEntry ? ARIA_CURRENT_LOCATION : ARIA_CURRENT_PAGE)
      return
    }

    const activationLine = this.getActivationLinePx()
    const reachedEntries = this.sectionEntries.filter(entry => {
      const rect = entry.section.getBoundingClientRect()
      return rect.top <= activationLine
    })

    const activeEntry = reachedEntries[reachedEntries.length - 1]
    this.setActive(activeEntry?.link ?? this.getHomeLink(), activeEntry ? ARIA_CURRENT_LOCATION : ARIA_CURRENT_PAGE)
  }

  syncInnerPage() {
    const page = this.getPageName()
    if (!ARTICLE_PAGES.has(page)) {
      this.clearActive()
      return
    }

    const articlesLink = this.links.find(link => {
      const linkUrl = this.resolveUrl(link)
      return linkUrl?.hash === ARTICLE_SECTION_HASH
    })

    this.setActive(articlesLink, ARIA_CURRENT_PAGE)
  }

  setActive(activeLink, ariaCurrentValue) {
    this.links.forEach(link => {
      const isActive = Boolean(activeLink) && link === activeLink
      link.classList.toggle(CLASSES.isActive, isActive)

      if (isActive && ariaCurrentValue) {
        link.setAttribute(ATTRIBUTES.ariaCurrent, ariaCurrentValue)
      } else {
        link.removeAttribute(ATTRIBUTES.ariaCurrent)
      }
    })
  }

  clearActive() {
    this.setActive(null, null)
  }

  getHomeLink() {
    return this.links.find(link => {
      const linkUrl = this.resolveUrl(link)
      return linkUrl && this.isIndexFile(linkUrl) && !linkUrl.hash
    })
  }

  getActivationLinePx() {
    const headerHeight = this.header?.getBoundingClientRect().height ?? 0
    return Math.max(headerHeight, this.window.innerHeight * ACTIVATION_LINE_RATIO)
  }

  isScrolledToBottom() {
    const scrollElement = this.document.scrollingElement ?? this.document.documentElement
    if (!scrollElement) return false

    const scrolledBottom = this.window.scrollY + this.window.innerHeight
    return scrolledBottom >= scrollElement.scrollHeight - BOTTOM_EDGE_THRESHOLD_PX
  }

  isHomePage() {
    return this.getPageName() === HOME_PAGE
  }

  getPageName() {
    return this.document.body?.dataset.page ?? ''
  }

  isArticlePageLink(linkUrl) {
    return this.isIndexFile(linkUrl) && linkUrl.hash === ARTICLE_SECTION_HASH
  }

  isIndexFile(url) {
    const file = url.pathname.split('/').pop() || HOME_FILE
    return file === HOME_FILE
  }

  resolveUrl(link) {
    try {
      return new URL(link.getAttribute('href'), this.window.location.href)
    } catch {
      return null
    }
  }

  now() {
    return this.window.performance?.now?.() ?? Date.now()
  }
}
