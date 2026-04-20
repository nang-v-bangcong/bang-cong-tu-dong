// GitHub API TS type stubs + helper — fleshed out in phase 06-08.

export type FileContent = {
  content: string
  sha: string
}

export type Release = {
  id: number
  tag_name: string
  name: string
  html_url: string
  published_at: string
}

export type Issue = {
  number: number
  title: string
  body: string
  state: 'open' | 'closed'
  html_url: string
  created_at: string
  labels: Array<{ name: string }>
}
