export interface HubHighlight {
  id: string
  title: string
  summary: string
  type?: "news" | "event" | "note"
  date?: string
}

export const HUB_NEWS_ITEMS: HubHighlight[] = []

export const HUB_EVENT_ITEMS: HubHighlight[] = []
