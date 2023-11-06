
export type Calendar = { [time: string]: CalEvent[] }

// TODO: Use a better data model. Do not couple with frontend.
export type CalEvent = {
  id: string,
  title: string,
  start: number,
  end: number,
}