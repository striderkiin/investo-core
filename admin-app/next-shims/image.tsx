import type { CSSProperties, ImgHTMLAttributes } from 'react'

export type StaticImageData = { src: string; width: number; height: number }

type StaticImage = { src: string; width?: number; height?: number }

type ImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'width' | 'height'> & {
  src: string | StaticImage
  width?: number | string
  height?: number | string
  priority?: boolean
  fill?: boolean
  quality?: number
  sizes?: string
  placeholder?: string
  unoptimized?: boolean
}

// Mirrors the <img> markup next/image emits (data-nimg, lazy loading unless
// priority, transparent text color while loading) so the template's CSS sees
// the same element it was written against.
const Image = ({ src, priority, fill, quality: _quality, placeholder: _placeholder, unoptimized: _unoptimized, style, ...rest }: ImageProps) => {
  const url = typeof src === 'string' ? src : src.src
  const mergedStyle: CSSProperties = fill
    ? { position: 'absolute', height: '100%', width: '100%', inset: 0, color: 'transparent', ...style }
    : { color: 'transparent', ...style }

  return (
    <img
      {...rest}
      src={url}
      loading={priority ? undefined : 'lazy'}
      fetchPriority={priority ? 'high' : undefined}
      decoding="async"
      data-nimg={fill ? 'fill' : '1'}
      style={mergedStyle}
    />
  )
}

export default Image
