export function KAgentFloating() {
  return (
    <button type="button" className="agent-launcher" aria-label="Open K-Agent">
      <span className="agent-launcher-surface" aria-hidden="true" />
      <span className="agent-launcher-inner" aria-hidden="true" />
      <img src="/assets/k-agent-floating.svg" alt="" />
    </button>
  )
}
