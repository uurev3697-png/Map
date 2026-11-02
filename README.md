# Маршрут — интерактивная карта с построением маршрутов

Веб-приложение на React: карта с переключаемыми слоями и построением маршрутов из точки А в точку Б
сразу **пешком и на машине**. У каждого маршрута есть время, расстояние, время прибытия и
пошаговые инструкции.

**Стек:** Vite · React · TypeScript · Tailwind CSS · Framer Motion · MapLibre GL JS ·
`@vis.gl/react-google-maps` (необязательно).

## Возможности

- **Слои карты:** «Схема» (OpenFreeMap), «Спутник» (Esri World Imagery), «Тёмная» и «Google» (если задан ключ).
- **Точки А и Б можно задать тремя способами:**
  - поиск адреса с автодополнением (Photon от Komoot, с debounce и отменой устаревших запросов);
  - клик по карте;
  - кнопка «Моё местоположение».
- Маркеры можно перетаскивать. Есть кнопка «поменять местами».
- **Два маршрута одновременно.** Карточки «Пешком» и «На машине» переключают активный маршрут.
  Неактивный рисуется полупрозрачной линией.
- **Анимации:** появление панелей, прорисовка линии маршрута, перелёт камеры к маршруту и к шагу инструкции.
- **Тема:** светлая и тёмная, по умолчанию как в системе.
- **Адаптивность:** на десктопе боковая панель, на телефоне нижняя шторка со свайпом.
- **Обработка ошибок:** нет сети, маршрут не найден, слишком далеко, лимит API, неверный ключ. Ошибки показываются уведомлениями.

## Быстрый старт

Нужен Node.js 20+.

```bash
npm install
cp .env.example .env   # ключи необязательны — без них всё работает
npm run dev            # http://localhost:5173
```

Другие команды:

```bash
npm run build     # production-сборка в dist/
npm run preview   # локальный просмотр сборки
npm run lint      # oxlint
```

## Переменные окружения

Все ключи хранятся только в `.env`. Этот файл уже в `.gitignore`, в репозиторий попадает только `.env.example`.

| Переменная                  | Обязательна | Что делает                                                                 |
| --------------------------- | ----------- | -------------------------------------------------------------------------- |
| `VITE_ORS_API_KEY`          | нет         | Роутинг через OpenRouteService. Без ключа используются публичные серверы OSRM. |
| `VITE_GOOGLE_MAPS_API_KEY`  | нет         | Включает слой «Google». Без ключа пункт скрыт.                             |
| `VITE_GOOGLE_MAPS_MAP_ID`   | нет         | Map ID для векторных карт Google. Без него используется `DEMO_MAP_ID`.      |

> ⚠️ Переменные с префиксом `VITE_` попадают в клиентский бандл, и их видно в браузере. Это нормально
> для ключей, которые предназначены для фронтенда. Обязательно **ограничьте ключи по домену**
> (см. ниже).

### Как получить бесплатный ключ OpenRouteService

1. Зарегистрируйтесь на <https://openrouteservice.org/dev/#/signup>.
2. В личном кабинете (**Dashboard → Tokens**) создайте токен с типом **Standard** (бесплатный тариф).
3. Скопируйте ключ в `.env`:
   ```
   VITE_ORS_API_KEY=ваш_ключ
   ```
4. Перезапустите `npm run dev`.

С ключом ORS инструкции приходят сразу на русском языке. На бесплатном тарифе есть дневные и
поминутные лимиты, при превышении приложение покажет уведомление «Превышен лимит запросов».

### Как получить ключ Google Maps

1. Откройте <https://console.cloud.google.com/> и создайте проект.
2. Подключите биллинг-аккаунт. Google требует его даже для бесплатной квоты.
3. В разделе **APIs & Services → Library** включите **Maps JavaScript API**.
4. В разделе **APIs & Services → Credentials** нажмите **Create credentials → API key**.
5. Ограничьте ключ (**Edit API key**):
   - *Application restrictions* → **Websites**. Добавьте `http://localhost:5173/*` и домен продакшена,
     например `https://your-app.vercel.app/*`.
   - *API restrictions* → **Maps JavaScript API**.
6. Необязательно: в **Google Maps Platform → Map management** создайте Map ID (тип JavaScript, Vector)
   и укажите его в `VITE_GOOGLE_MAPS_MAP_ID`.
7. Запишите ключ в `.env`:
   ```
   VITE_GOOGLE_MAPS_API_KEY=ваш_ключ
   ```

Google Maps подключается **только** через официальный Maps JavaScript API. Тайлы Google в MapLibre
не загружаются, потому что это нарушает условия использования Google. В режиме Google маршрут
по-прежнему считает наш слой сервисов (ORS/OSRM) и рисует его через `google.maps.Polyline`.

## Деплой на Vercel

**Через веб-интерфейс:**

1. Загрузите репозиторий на GitHub.
2. На <https://vercel.com/new> импортируйте репозиторий. Vercel сам определит Vite:
   - Build Command: `npm run build`
   - Output Directory: `dist`
3. В **Settings → Environment Variables** добавьте нужные переменные (`VITE_ORS_API_KEY`,
   `VITE_GOOGLE_MAPS_API_KEY`, `VITE_GOOGLE_MAPS_MAP_ID`) для окружений Production и Preview.
4. Нажмите **Deploy**. Переменные подставляются при сборке, поэтому после их изменения нужен
   повторный деплой (**Deployments → Redeploy**).
5. Добавьте домен Vercel в ограничения ключа Google (см. выше).

**Через CLI:**

```bash
npm i -g vercel
vercel                 # первый деплой (preview)
vercel env add VITE_ORS_API_KEY
vercel --prod          # продакшен
```

Приложение одностраничное, без роутера, поэтому дополнительный `vercel.json` не нужен.

## Архитектура

```
src/
  services/                  ← слой сервисов, не зависит от UI
    types.ts                 ← LngLat, Route, RouteStep, Place
    errors.ts                ← ServiceError (not-found / too-far / network / rate-limit / auth) + request()
    routing/
      types.ts               ← интерфейс RoutingProvider
      ors.ts                 ← OpenRouteService (foot-walking, driving-car)
      osrm.ts                ← OSRM routing.openstreetmap.de (routed-foot, routed-car)
      osrmInstructions.ts    ← русские формулировки манёвров для OSRM
      index.ts               ← выбор провайдера: ORS при наличии ключа, иначе OSRM
    geocoding/
      types.ts               ← интерфейс GeocodingProvider (search + reverse)
      photon.ts              ← Photon (Komoot)
      index.ts               ← активный геокодер
  map/
    MapView.tsx              ← MapLibre: стили, маркеры, слои маршрута, камера
    GoogleMapView.tsx        ← Google Maps (загружается лениво, только с ключом)
    routeLayers.ts           ← слои линии и анимация прорисовки (line-gradient)
    styles.ts                ← описания слоёв карты и цвета маршрутов
    markers.ts               ← DOM кастомных маркеров А/Б
  hooks/                     ← useRoutePlanner, useSuggestions, useTheme, …
  components/                ← панель, поля, карточки, инструкции, шторка, уведомления
  lib/format.ts              ← «1 ч 25 мин», «12,4 км», время прибытия
```

### Как подключить другой провайдер (GraphHopper, Google Routes и др.)

1. Создайте класс, реализующий `RoutingProvider` из `src/services/routing/types.ts`:
   ```ts
   export class GraphHopperProvider implements RoutingProvider {
     readonly id = 'graphhopper'
     readonly name = 'GraphHopper'
     async route(mode, from, to, signal) { /* … вернуть Route */ }
   }
   ```
2. Ошибки бросайте как `ServiceError` с нужным `kind`, тогда UI сам покажет понятное уведомление.
3. Подключите класс в `src/services/routing/index.ts`.

Геокодер (например, Nominatim) подключается так же: реализуйте `GeocodingProvider` и укажите его в
`src/services/geocoding/index.ts`.

## Данные и условия использования

- Картографические данные: © участники [OpenStreetMap](https://www.openstreetmap.org/copyright).
- Векторные тайлы: [OpenFreeMap](https://openfreemap.org/) и OpenMapTiles.
- Спутник: Tiles © Esri. Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community.
- Поиск: [Photon](https://photon.komoot.io/) от Komoot. Публичный инстанс предназначен для
  умеренной нагрузки, поэтому запросы идут с debounce (350 мс), не чаще одного на ввод, от 3 символов,
  а устаревшие запросы отменяются. Для высокой нагрузки разверните свой Photon.
- Маршруты без ключа: публичные серверы OSRM от FOSSGIS
  ([routing.openstreetmap.de](https://routing.openstreetmap.de/)). Они рассчитаны на некоммерческое
  использование. Для продакшена с трафиком используйте ORS с ключом или свой сервер.
