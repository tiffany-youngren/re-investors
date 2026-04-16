// US state abbreviations for dropdown selects
export const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
  'DC',
]

// Country codes for phone dropdown. `digits` is the max raw digit length.
export const COUNTRY_CODES = [
  { code: '+1',   label: 'US',  digits: 10 },
  { code: '+1',   label: 'CA',  digits: 10 },
  { code: '+44',  label: 'UK',  digits: 10 },
  { code: '+52',  label: 'MX',  digits: 10 },
  { code: '+61',  label: 'AU',  digits: 9  },
  { code: '+33',  label: 'FR',  digits: 9  },
  { code: '+49',  label: 'DE',  digits: 11 },
  { code: '+34',  label: 'ES',  digits: 9  },
  { code: '+39',  label: 'IT',  digits: 10 },
  { code: '+81',  label: 'JP',  digits: 10 },
  { code: '+86',  label: 'CN',  digits: 11 },
  { code: '+91',  label: 'IN',  digits: 10 },
  { code: '+55',  label: 'BR',  digits: 11 },
]

export const DEFAULT_COUNTRY_CODE = '+1'

// Format raw digits based on country code.
// US/CA (+1): (xxx) xxx-xxxx. Other countries: groups of 3.
export function formatPhone(value, countryCode = DEFAULT_COUNTRY_CODE) {
  const digits = value.replace(/\D/g, '')
  if (countryCode === '+1') {
    const d = digits.slice(0, 10)
    if (d.length === 0) return ''
    if (d.length <= 3) return `(${d}`
    if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
  }
  // Generic formatting for other countries: space every 3 digits
  const d = digits.slice(0, 15)
  return d.replace(/(\d{3})(?=\d)/g, '$1 ').trim()
}

// Strip formatting to get raw digits for database storage
export function stripPhone(value) {
  return value.replace(/\D/g, '').slice(0, 15)
}

// Format a stored phone number for display, with country code prefix
export function displayPhone(raw, countryCode = DEFAULT_COUNTRY_CODE) {
  if (!raw) return ''
  const digits = raw.replace(/\D/g, '')
  if (!digits) return ''
  const formatted = formatPhone(digits, countryCode)
  return `${countryCode} ${formatted}`
}
