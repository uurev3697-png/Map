export type ServiceErrorKind =
  | 'not-found'
  | 'too-far'
  | 'network'
  | 'rate-limit'
  | 'auth'
  | 'aborted'
  | 'unknown'

const MESSAGES: Record<ServiceErrorKind, string> = {
  'not-found': 'Маршрут не найден. Попробуйте сдвинуть точки ближе к дороге.',
  'too-far': 'Слишком большое расстояние для этого способа передвижения.',
  network: 'Нет соединения с сервером. Проверьте интернет.',
  'rate-limit': 'Превышен лимит запросов к сервису. Подождите немного.',
  auth: 'Неверный или отсутствующий API-ключ.',
  aborted: 'Запрос отменён.',
  unknown: 'Что-то пошло не так. Попробуйте ещё раз.',
}

export class ServiceError extends Error {
  readonly kind: ServiceErrorKind
  constructor(kind: ServiceErrorKind, message?: string) {
    super(message ?? MESSAGES[kind])
    this.kind = kind
    this.name = 'ServiceError'
  }
}

export function isAbort(e: unknown): boolean {
  return (
    (e instanceof DOMException && e.name === 'AbortError') ||
    (e instanceof ServiceError && e.kind === 'aborted')
  )
}

export function statusToKind(status: number): ServiceErrorKind {
  if (status === 429) return 'rate-limit'
  if (status === 401 || status === 403) return 'auth'
  if (status === 404) return 'not-found'
  return 'unknown'
}

/**
 * fetch с единообразной обработкой ошибок сети и HTTP-статусов.
 * onError позволяет провайдеру разобрать тело ошибки по-своему.
 */
export async function request<T>(
  url: string,
  init: RequestInit = {},
  onError?: (status: number, body: unknown) => ServiceError | undefined,
): Promise<T> {
  let res: Response
  try {
    res = await fetch(url, init)
  } catch (e) {
    if (isAbort(e)) throw new ServiceError('aborted')
    throw new ServiceError('network')
  }
  if (!res.ok) {
    let body: unknown = null
    try {
      body = await res.json()
    } catch {
      /* тело не JSON */
    }
    throw onError?.(res.status, body) ?? new ServiceError(statusToKind(res.status))
  }
  try {
    return (await res.json()) as T
  } catch (e) {
    if (isAbort(e)) throw new ServiceError('aborted')
    throw new ServiceError('unknown', 'Сервер вернул некорректный ответ.')
  }
}
