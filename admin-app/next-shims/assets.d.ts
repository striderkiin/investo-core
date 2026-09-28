type StaticImageData = { src: string; width: number; height: number }

declare module '*.png' {
  const content: StaticImageData
  export default content
}
declare module '*.jpg' {
  const content: StaticImageData
  export default content
}
declare module '*.jpeg' {
  const content: StaticImageData
  export default content
}
declare module '*.gif' {
  const content: StaticImageData
  export default content
}
declare module '*.webp' {
  const content: StaticImageData
  export default content
}
declare module '*.svg' {
  const content: StaticImageData
  export default content
}
declare module '*.ico' {
  const content: StaticImageData
  export default content
}
declare module 'react-apexcharts/dist/react-apexcharts.min.js'
declare module '*.css'
declare module '*.scss'
