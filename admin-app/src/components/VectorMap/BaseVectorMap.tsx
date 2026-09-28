"use client"
import { useEffect, useState, useRef } from 'react'

type BaseVectorMapProps = {
	width?: string
	height?: string
	options?: any
	type: string
}

const BaseVectorMap = ({
	width,
	height,
	options,
	type,
}: BaseVectorMapProps) => {
	const selectorId = type + new Date().getTime()
	const ref = useRef<HTMLDivElement | null>(null)
	const [map, setMap] = useState()

	useEffect(() => {
		if (!map && ref.current) {
			const map = new (window as any)['jsVectorMap']({
				selector: ref.current,
				map: type,
				...options,
			})
			setMap(map)
		}
	}, [selectorId, map, options, type, ref])

	return (
		<div
			id={selectorId}
			ref={ref}
			style={{ width: width, height: height }}
		></div>
	)
}

export default BaseVectorMap
