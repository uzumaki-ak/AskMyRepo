"use client"

import React, { useEffect, useRef } from "react"
import mermaid from "mermaid"
import { useTheme } from "next-themes"

interface MermaidProps {
  chart: string
}

const Mermaid: React.FC<MermaidProps> = ({ chart }) => {
  const ref = useRef<HTMLDivElement>(null)
  const { theme } = useTheme()

  useEffect(() => {
    const isDark = theme === 'dark'
    mermaid.initialize({
      startOnLoad: true,
      theme: isDark ? "dark" : "default",
      securityLevel: "loose",
      fontFamily: "var(--font-inter)",
    })
    
    if (ref.current && chart) {
      ref.current.removeAttribute("data-processed")
      // We need to clear the content because mermaid appends the SVG
      ref.current.innerHTML = chart
      mermaid.contentLoaded()
    }
  }, [chart, theme])

  return (
    <div className="mermaid flex justify-center w-full overflow-auto bg-transparent" ref={ref}>
      {chart}
    </div>
  )
}

export default Mermaid
