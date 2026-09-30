/**
 * Where the report was filed from. Read at submit time, not at open time, so a
 * report reflects the page the reporter was looking at when they pressed Send.
 */
export type PageContext = {
  page_url: string
  route: string
  viewport: string
  user_agent: string
}

export function pageContext(): PageContext {
  return {
    page_url: window.location.href,
    route: window.location.pathname,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    user_agent: navigator.userAgent,
  }
}
