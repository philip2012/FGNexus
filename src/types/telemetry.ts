export interface TelemetryItem {
  label: string
  value: number | null
  unit: string
  decimals?: number
  signed?: boolean
  padded?: number
  coordinate?: 'latitude' | 'longitude'
}
