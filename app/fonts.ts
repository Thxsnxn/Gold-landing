import localFont from 'next/font/local'

// DB Helvethaica X Bold — for title "ราคาทองแท่งวันนี้"
export const dbHelvethaicaBd = localFont({
  src: '../public/fonts/DB Helvethaica X Bd.ttf',
  display: 'swap',
  variable: '--font-db-bd',
})

// DB Helvethaica X Thin — for timestamp meta info
export const dbHelvethaicaThin = localFont({
  src: '../public/fonts/DB Helvethaica X Thin.ttf',
  display: 'swap',
  variable: '--font-db-thin',
})

// DB Helvethaica X Medium — for price labels & values
export const dbHelvethaicaMed = localFont({
  src: '../public/fonts/DB Helvethaica X Med.ttf',
  display: 'swap',
  variable: '--font-db-med',
})
