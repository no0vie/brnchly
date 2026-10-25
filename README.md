# brnchly — Evolution Graph

Интерактивный редактор и renderer эволюционных графов. Проект развивается поэтапно из визуализатора карьерного трека в универсальный инструмент для skill trees, технологических деревьев и временных эволюционных графов.

## Текущий статус

**Evolution Graph 2.0 — Phase 1 (Architecture) завершена.**

Существующий Classic UI сохранён. Поверх него добавлены версионируемая доменная модель, runtime-валидация, миграции, JSON codec и независимая от editor/store граница renderer.

## Результаты аудита исходной версии

- Приложение — React 18 + TypeScript strict + Vite, UI построен на Ant Design.
- MobX `EvolutionStore` управляет только массивом `EvolutionStep[]`; состояние modal частично дублировалось в provider.
- Визуальные узлы хранились отдельно как статический `GraphItem[]`.
- Связи не были предметными данными: renderer рисовал линию между соседними элементами массива.
- Идентификаторами DnD фактически служили имена этапов, поэтому они не гарантировали стабильность/уникальность.
- Ручные координаты поддерживались для `GraphItem`, а автоматические позиции рассчитывались внутри React-компонента.
- Уже существовали и переиспользованы: horizontal/vertical отображение, auto-scroll, pause/resume, speed control, hover details, dark/light theme, CRUD и keyboard DnD для evolution steps.
- Сохранения графа, import/export, undo/redo, веток, типизированных рёбер и проверки циклов не было. `localStorage` использовался только для темы.
- Renderer принимал данные через props, но его legacy-типы и расположение рядом с editor-компонентами не формировали публичную embeddable-границу.

## Архитектура Phase 1

```text
src/
├── domain/evolutionGraph/     # Чистая предметная модель, validation, migrations, JSON codec
├── renderer/                  # Store-независимый публичный renderer API
├── stores/                    # Существующее editor state (MobX)
├── components/                # Существующий Classic UI и editor modals
└── data/                      # Legacy demo data
```

### Предметные данные

`EvolutionGraph` содержит:

- `schemaVersion`, стабильные `id`, `title`;
- независимые `branches`, `nodes`, `edges`;
- статусы `locked | available | acquired | mastered`;
- связи `dependency | evolution | related`;
- optional evidence, level, acquired timestamp и ручную position;
- extension metadata для lossless migration legacy-полей.

Визуальные параметры отделены в `EvolutionViewSettings`: mode, theme, layout, autoplay, playback speed и active branch.

### Инварианты

`validateEvolutionGraph` проверяет:

- форму header/collections и допустимые enum-значения;
- уникальность branch/node/edge ID;
- ссылки node → branch и edge → source/target nodes;
- self-dependency;
- циклы только в `dependency`-подграфе.

Перекрёстные зависимости между ветками разрешены.

### Миграции и JSON

- Текущая schema version: `1`.
- `migrateLegacyEvolutionData(items, steps)` детерминированно преобразует исходные `GraphItem[] + EvolutionStep[]`, сохраняя тексты, порядок, difficulty, offsets и ручные координаты.
- `migrateEvolutionGraph` обновляет schema v0 до v1 и отклоняет неизвестные будущие версии.
- `serializeEvolutionGraph` валидирует данные до export.
- `parseEvolutionGraph` оборачивает malformed JSON, ошибки миграции и ошибки модели в `EvolutionGraphImportError` с понятным сообщением.

## Embeddable renderer API

Renderer не импортирует MobX stores, editor context или глобальное состояние:

```tsx
import { EvolutionGraphView } from './renderer';

<EvolutionGraphView
  graph={graph}
  mode="classic"
  readonly
  theme="dark"
  autoplay={false}
  onNodeClick={(node) => console.log(node.id)}
/>
```

В Phase 1 все данные проходят через новый контракт, а Classic Mode использует адаптер к существующему UI. Интерактивные карточки доступны с клавиатуры (`Enter`/`Space`) при наличии `onNodeClick`.

## Запуск

```bash
npm install
npm run dev
```

Проверки:

```bash
npm test
npm run lint
npm run build
```

TypeScript работает в strict mode.

## Следующие фазы

### Phase 2 — Graph Engine

- layout abstraction: horizontal/vertical DAG, radial tree, manual;
- deterministic layout tests и поддержка нескольких родителей;
- полноценный canvas pan/zoom/fit-to-view;
- branches и typed edges в UI.

### Phase 3 — Evolution Experience

- отдельные Evolution и Skill Tree modes;
- staged playback, animated edges/nodes и reduced-motion;
- branch focus и dependency highlighting.

### Phase 4 — Editor

- CRUD branches/nodes/edges;
- graph-level drag & drop, undo/redo;
- import/export UI, localStorage autosave и validation feedback.

### Phase 5 — Integration Readiness

- Developer Evolution demo dataset;
- read-only integration examples;
- подготовка package boundary.

## Оставшиеся риски после Phase 1

- Legacy editor пока изменяет только evolution steps; полноценное редактирование новой модели относится к Phase 4.
- Classic renderer визуализирует узлы последовательно и не показывает произвольные typed edges/branches — это задача Phase 2.
- Данные графа пока не сохраняются в `localStorage`; сохранение темы осталось без изменений.
- Нет layout/performance тестов для 100+ nodes до появления Graph Engine.
- Production bundle Ant Design превышает 500 kB; code splitting не входил в Phase 1.
