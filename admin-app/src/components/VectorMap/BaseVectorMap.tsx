"use client"
import { useEffect, useRef } from 'react'

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

	// One map per mount. StrictMode runs effects twice, so the first map is
	// destroyed on cleanup instead of a second one being stacked beneath it.
	useEffect(() => {
		if (!ref.current) return
		const map = new (window as any)['jsVectorMap']({
			selector: ref.current,
			map: type,
			...options,
		})
		const container = ref.current
		return () => {
			map?.destroy?.()
			container.innerHTML = ''
		}
	}, [options, type])

	return (
		<div
			id={selectorId}
			ref={ref}
			style={{ width: width, height: height }}
		></div>
	)
}

export default BaseVectorMap
