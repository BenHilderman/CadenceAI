"use client"

import { Component, type ReactNode } from "react"

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
}

/**
 * ErrorBoundary that wraps graphics-heavy components (WebGL, Canvas).
 * If they crash, the rest of the page (voice UI) keeps working.
 */
export class GraphicsBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error) {
    console.warn("Graphics component crashed, rendering fallback:", error.message)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div
          className="fixed inset-0 z-0"
          style={{
            background: "radial-gradient(ellipse at 50% 50%, #0a0a14 0%, #000000 100%)",
          }}
        />
      )
    }
    return this.props.children
  }
}
