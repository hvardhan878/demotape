/** Public sample project — anyone with a session can view; only the owning session can generate. */
export const DEMO_PROJECT_ID = '2618b188-1306-4f02-af7b-863cd0eb0cf3'

export function isDemoProjectId(id: string): boolean {
  return id === DEMO_PROJECT_ID
}
