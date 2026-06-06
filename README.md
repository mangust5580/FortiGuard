# FortiGuard [![Deploy GitHub Pages](https://github.com/mangust5580/FortiGuard/actions/workflows/deploy.yml/badge.svg)](https://github.com/mangust5580/FortiGuard/actions/workflows/deploy.yml) [![License](https://img.shields.io/github/license/mangust5580/FortiGuard)](LICENSE) [![Node.js](https://img.shields.io/badge/node-%3E%3D20-339933?logo=node.js&logoColor=white)](package.json) [![Live demo](https://img.shields.io/badge/live-demo-2ea44f)](https://mangust5580.github.io/FortiGuard/)

FortiGuard — портфолио-проект в формате многостраничного SaaS-сайта для вымышленной платформы кибербезопасности и мониторинга угроз.

Проект сделан как витринная работа: он показывает семантическую HTML-разметку, SCSS-архитектуру, дизайн-токены, адаптивные изображения, модальные сценарии, базовую доступность, SEO-метаданные и production-oriented сборку статического сайта.

Контент, контакты, юридические страницы, статьи и сценарии форм являются демонстрационными. Форма не отправляет и не сохраняет реальные данные: backend и сторонний form service не используются. Реальных клиентских данных, NDA-материалов и production-бизнес-информации в проекте нет.

## Состав проекта

- Главная страница с hero-блоком, преимуществами, решениями, тарифами, отзывами, статьями, контактным блоком и FAQ.
- Страница списка статей.
- Страница отдельной статьи.
- Кастомная страница 404.
- Страница политики конфиденциальности.
- Страница условий использования.
- Модальные сценарии для запроса демо и консультации.
- Адаптивная вёрстка от 320px.
- Подготовка к публикации на GitHub Pages через GitHub Actions.

## Quality checks

- Lighthouse Mobile: Performance 90+, Accessibility 100, Best Practices 100, SEO 100.
- Lighthouse Desktop: Performance 100, Accessibility 100, Best Practices 100, SEO 100.
- `npm run check` passes.

## Сборка

Проект использует локально обновлённую версию кастомной Gulp 5 сборки на базе подхода `gulp-lonrav`.

Сборка обрабатывает HTML-шаблоны, SCSS, JavaScript-модули, изображения, SVG-иконки, favicon, sitemap и production-артефакты для GitHub Pages.

## Стек

- HTML-шаблоны с includes.
- SCSS с компонентной структурой в стиле БЭМ.
- CSS custom properties для дизайн-токенов.
- Fluid-типографика и helpers для адаптивных размеров.
- Vanilla JavaScript-модули, собираемые через esbuild.
- Gulp 5 pipeline.
- Оптимизация изображений и генерация responsive AVIF/WebP/PNG.
- Оптимизация SVG и генерация SVG-спрайта.
- ESLint, Stylelint, Prettier.
- GitHub Actions и GitHub Pages.

## Требования

Node.js `>=20`.

## Команды

```bash
npm ci
npm run dev
npm run build
npm run preview
npm run check
