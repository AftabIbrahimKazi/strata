const ATTRS = `viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"`

export const store = `<svg ${ATTRS}><path d="M3 9l1-5h16l1 5"/><path d="M3 9v11a1 1 0 001 1h16a1 1 0 001-1V9"/><path d="M3 9h18"/><path d="M9 9v4a3 3 0 006 0V9"/><path d="M10 21v-6h4v6"/></svg>`

export const bus = `<svg ${ATTRS}><rect x="4" y="3" width="16" height="16" rx="2"/><path d="M4 11h16"/><path d="M8 3v8"/><path d="M16 3v8"/><circle cx="8.5" cy="17" r="1.5"/><circle cx="15.5" cy="17" r="1.5"/><path d="M9 21h6"/><path d="M8 19v2"/><path d="M16 19v2"/></svg>`

export const parking = `<svg ${ATTRS}><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M9 8h4a3 3 0 010 6H9V8z"/><path d="M9 14v2"/></svg>`

export const hospital = `<svg ${ATTRS}><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M12 8v8"/><path d="M8 12h8"/></svg>`

export const restaurant = `<svg ${ATTRS}><path d="M5 3v18"/><path d="M5 12h5"/><path d="M10 3v9a2 2 0 002 2h0a2 2 0 002-2V3"/><path d="M19 3v18"/></svg>`

export const cafe = `<svg ${ATTRS}><path d="M5 11h11v5a4 4 0 01-4 4H9a4 4 0 01-4-4v-5z"/><path d="M16 11h2a2 2 0 010 4h-2"/><path d="M8 4v2"/><path d="M12 4v2"/><path d="M10 4v2"/></svg>`

export const bank = `<svg ${ATTRS}><path d="M3 21h18"/><path d="M3 10h18"/><path d="M5 10V21"/><path d="M19 10V21"/><path d="M3 10l9-7 9 7"/><path d="M9 21v-7h6v7"/></svg>`

export const atm = `<svg ${ATTRS}><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/><path d="M7 15h.01"/><path d="M11 15h2"/></svg>`

export const pharmacy = `<svg ${ATTRS}><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="2"/><path d="M12 11v4"/><path d="M10 13h4"/></svg>`

export const school = `<svg ${ATTRS}><path d="M22 10v6M2 10l10-5 10 5-10 5-10-5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>`

export const park = `<svg ${ATTRS}><path d="M12 22V12"/><path d="M5 9l7-7 7 7"/><path d="M5 15l7-7 7 7"/></svg>`

export const hotel = `<svg ${ATTRS}><path d="M3 7v13"/><path d="M3 12h18"/><path d="M21 7v13"/><rect x="7" y="7" width="10" height="5" rx="1"/></svg>`

export const gas = `<svg ${ATTRS}><path d="M4 20V6a2 2 0 012-2h8a2 2 0 012 2v14"/><path d="M2 20h14"/><path d="M16 8h2a2 2 0 012 2v3a2 2 0 01-2 2h-2"/><path d="M18 13v3a2 2 0 002 2"/></svg>`

export const train = `<svg ${ATTRS}><rect x="4" y="3" width="16" height="13" rx="2"/><path d="M4 11h16"/><path d="M8 3v8"/><path d="M16 3v8"/><circle cx="9" cy="16" r="1"/><circle cx="15" cy="16" r="1"/><path d="M6 20l3-4"/><path d="M18 20l-3-4"/></svg>`

export const bike = `<svg ${ATTRS}><circle cx="5" cy="15" r="4"/><circle cx="19" cy="15" r="4"/><path d="M5 15l7-11 2 6h5l-3 5"/><path d="M12 4l2 6"/></svg>`

export const phone = `<svg ${ATTRS}><path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2"/></svg>`

export const clock = `<svg ${ATTRS}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>`

export const directions = `<svg ${ATTRS}><path d="M3 12h18"/><path d="M3 12l4-4"/><path d="M3 12l4 4"/><path d="M21 12l-4-4"/><path d="M21 12l-4 4"/></svg>`

export const marker = `<svg ${ATTRS}><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>`

export const info = `<svg ${ATTRS}><circle cx="12" cy="12" r="9"/><path d="M12 8h.01"/><path d="M11 12h1v4h1"/></svg>`

const registry: Record<string, string> = {
  store,
  bus,
  parking,
  hospital,
  restaurant,
  cafe,
  bank,
  atm,
  pharmacy,
  school,
  park,
  hotel,
  gas,
  train,
  bike,
  phone,
  clock,
  directions,
  marker,
  info,
}

export function getIcon(name: string): string {
  return registry[name] ?? marker
}
