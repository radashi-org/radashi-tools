export function* timeUnits(): Generator<[number, Intl.RelativeTimeFormatUnit]> {
  yield [31536000000, 'year']
  yield [2592000000, 'month']
  yield [86400000, 'day']
  yield [3600000, 'hour']
  yield [60000, 'minute']
  yield [1000, 'second']
}

export function formatRelativeElapsedTime(ms: number, locale = 'en'): string {
  for (const [factor, unit] of timeUnits()) {
    if (Math.abs(ms) >= factor) {
      const value = +(ms / factor).toFixed(0)
      return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(
        -value,
        unit,
      )
    }
  }
  return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(
    0,
    'second',
  )
}
