export type CoordinateType = [x: number, y: number]

export type PlaceType = number[][]

export type Matrix = number[][]

export type CollideType = 'left' | 'right' | 'bottom'

export type MatrixHistory = {
  matrix: Matrix
  xAxis: number
  yAxis: number
}

export type PieceType = 'I' | 'J' | 'L' | 'T' | 'S' | 'O' | 'Z'
export type Control = 'Left' | 'Right' | 'Rotate' | 'Down'
export type ControlHistory = {
  pieceType: PieceType
  control: Control
}

export type BorderWidth = { top: boolean; bottom: boolean; left: boolean; right: boolean }
