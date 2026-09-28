// next/font/google self-hosts the font and returns a generated class that
// sets font-family; the stylesheet link in admin-app/index.html loads the same
// family and weights, and this class applies it the same way.
export const Be_Vietnam_Pro = (_options: { weight?: string[]; display?: string; subsets?: string[] }) => ({
  className: 'next-font-be-vietnam-pro',
  style: { fontFamily: "'Be Vietnam Pro', sans-serif" },
})
