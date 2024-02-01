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
export type Control = 'Left' | 'Right' | 'Rotate'
export type ControlHistory = {
  pieceType: PieceType
  control: Control
}
