export function isWithinActiveHours(school) {
  if (!school?.active_start_time || !school?.active_end_time) return true
  const now = new Date()
  const days = school.active_days ?? [1, 2, 3, 4, 5]
  if (!days.includes(now.getDay())) return false
  const [sh, sm] = school.active_start_time.split(':').map(Number)
  const [eh, em] = school.active_end_time.split(':').map(Number)
  const nowMin = now.getHours() * 60 + now.getMinutes()
  return nowMin >= sh * 60 + sm && nowMin < eh * 60 + em
}
