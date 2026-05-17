export interface DonutChartSegment {
  label: string
  value: number
  color: string
}

export interface DonutChartProps {
  segments: DonutChartSegment[]
  size?: number
  thickness?: number
}
