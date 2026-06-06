/**
 * Outstanding Balance Calculator
 *
 * Logic:
 * - For each month since tenancy start where the rent due day has passed,
 *   that month's rent is considered "due"
 * - Outstanding = (total due months × monthly_rent) − sum of confirmed payments
 * - monthly_rent = base_rent + electricity_charges + water_charges
 */

/**
 * Calculate how many months of rent are due for a tenancy.
 * @param {string} startDate  — tenancy start date (ISO string or Date)
 * @param {number} dueDayOfMonth — day of month rent is due (1–28)
 * @returns {number} number of months where rent has become due
 */
export function calcDueMonths(startDate, dueDayOfMonth) {
  const now   = new Date()
  const start = new Date(startDate)
  const dueDay = parseInt(dueDayOfMonth) || 1

  let dueMonths = 0
  // Iterate from tenancy start month to current month
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1)
  const endMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  while (cursor <= endMonth) {
    const year  = cursor.getFullYear()
    const month = cursor.getMonth() // 0-indexed

    // The due date for this month
    const dueDate = new Date(year, month, dueDay)

    // Only count if due date has passed AND due date is on or after tenancy start
    if (dueDate >= start && dueDate <= now) {
      dueMonths++
    }

    cursor.setMonth(cursor.getMonth() + 1)
  }

  return dueMonths
}

/**
 * Calculate outstanding balance for a tenancy.
 * @param {object} tenancy  — tenancy record with monthly_rent, start_date, rent_due_day
 * @param {object} unit     — unit record with electricity_charges, water_charges
 * @param {Array}  payments — all payments for this tenancy
 * @returns {number} outstanding amount in LKR
 */
export function calcOutstanding(tenancy, unit, payments) {
  const monthlyRent = parseFloat(tenancy.monthly_rent || 0)
    + parseFloat(unit?.electricity_charges || 0)
    + parseFloat(unit?.water_charges || 0)

  const dueMonths = calcDueMonths(tenancy.start_date, tenancy.rent_due_day || 1)
  const totalDue  = dueMonths * monthlyRent

  const totalConfirmed = (payments || [])
    .filter(p => p.status === 'confirmed')
    .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0)

  return Math.max(0, totalDue - totalConfirmed)
}
