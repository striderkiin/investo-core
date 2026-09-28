'use client'
import 'jsvectormap'
import 'jsvectormap/dist/maps/world.js'
import 'jsvectormap/dist/jsvectormap.min.css'

//components
import BaseVectorMap from './BaseVectorMap'

interface WorldVectorMapProps {
  width?: string
  height?: string
  options?: any
}

const WorldVectorMap = ({ width, height, options }: WorldVectorMapProps) => {
  return (
    <>
      <BaseVectorMap width={width} height={height} options={options} type="world" />
    </>
  )
}

export default WorldVectorMap
