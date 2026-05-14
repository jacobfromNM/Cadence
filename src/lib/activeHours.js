// Returns true when the current moment falls within the school's configured
// active window, evaluated in the school's own timezone (not the viewer's
// device timezone). Falls back to the device timezone if none is stored.
export function isWithinActiveHours(school) {
  if (!school?.active_start_time || !school?.active_end_time) return true

  const tz = school.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
  const now = new Date()

  // formatToParts gives locale-independent access to each date component
  // in the target timezone without any manual string-parsing hacks.
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now)

  const get = (type) => parts.find(p => p.type === type)?.value ?? ''

  const DAY_INDEX = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  const day = DAY_INDEX[get('weekday')]
  // hour12:false can return '24' at midnight in some engines — wrap with %24
  const h = parseInt(get('hour'), 10) % 24
  const m = parseInt(get('minute'), 10)

  const days = school.active_days ?? [1, 2, 3, 4, 5]
  if (!days.includes(day)) return false

  const [sh, sm] = school.active_start_time.split(':').map(Number)
  const [eh, em] = school.active_end_time.split(':').map(Number)
  const nowMin = h * 60 + m
  return nowMin >= sh * 60 + sm && nowMin < eh * 60 + em
}
