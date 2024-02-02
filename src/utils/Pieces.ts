import {
  Control,
  ControlHistory,
  CoordinateType,
  Matrix,
  MatrixHistory,
  PieceType,
} from '@/type'

export class Piece {
  private _pieceType!: PieceType
  private _matrix: Matrix
  private _xAxis: number = 4
  private _yAxis: number = 0
  private _coordinatesHistory: MatrixHistory[] = []
  private _controlHistory: ControlHistory[] = []

  constructor(matrix: Matrix, pieceType: PieceType) {
    this._matrix = matrix
    this._pieceType = pieceType
  }
  get yAxis() {
    return this._yAxis
  }
  get coordinates() {
    return this._matrix
      .map((y, yIndex) => {
        return y.map((x, xIndex) =>
          x !== 0 ? [yIndex + this._yAxis, xIndex + this._xAxis] : undefined,
        )
      })
      .flat()
      .filter((x) => x) as CoordinateType[]
  }
  get coordinateOfEmptyMatrix() {
    return this._matrix
      .map((y, yIndex) => {
        return y.map((x, xIndex) =>
          x !== 0 ? undefined : [yIndex + this._yAxis, xIndex + this._xAxis],
        )
      })
      .flat()
      .filter((x) => x) as CoordinateType[]
  }
  get pieceType() {
    return this._pieceType
  }
  get matrix() {
    return this._matrix
  }
  get controlHistory() {
    return this._controlHistory
  }

  private _rotate() {
    const rows = this._matrix.length
    const cols = this._matrix[0].length

    // 創建一個新的矩陣，用來存儲旋轉後的結果
    const rotatedMatrix = new Array(cols).fill(0).map(() => new Array(rows).fill(0))

    // 進行旋轉計算
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        rotatedMatrix[j][rows - 1 - i] = this._matrix[i][j]
      }
    }

    this._matrix = rotatedMatrix
  }

  private _saveCoordinatesHistory() {
    this._coordinatesHistory.push({
      matrix: this._matrix,
      xAxis: this._xAxis,
      yAxis: this._yAxis,
    })
    if (this._coordinatesHistory.length > 10) {
      this._coordinatesHistory.unshift()
    }
  }

  private _saveControlHistory(control: Control) {
    this._controlHistory.push({
      control,
      pieceType: this._pieceType,
    })
    if (this._controlHistory.length > 10) {
      this._controlHistory.unshift()
    }
  }

  /**
   * rotate the current piece
   * @returns void
   */
  public rotate() {
    this._saveControlHistory('Rotate')
    this._saveCoordinatesHistory()
    this._rotate()
  }
  /**
   * move the current piece to right
   */
  public moveRight() {
    this._saveControlHistory('Right')
    this._saveCoordinatesHistory()
    this._xAxis = this._xAxis + 1
  }
  /**
   * move the current piece to left
   */
  public moveLeft() {
    this._saveControlHistory('Left')
    this._saveCoordinatesHistory()
    this._xAxis = this._xAxis - 1
  }
  /**
   * move current piece down
   */
  public moveDown() {
    this._saveControlHistory('Down')
    this._saveCoordinatesHistory()
    this._yAxis = this._yAxis + 1
  }

  public restoreHistory() {
    if (this._coordinatesHistory.length === 0)
      throw new Error('PieceHistory does not have any history')
    const { matrix, xAxis, yAxis } = this._coordinatesHistory.pop() as MatrixHistory

    this._matrix = matrix
    this._xAxis = xAxis
    this._yAxis = yAxis
  }

  public moveAxisByNumber(axis: 'x' | 'y', number: number) {
    if (axis === 'x') this._xAxis -= number
    if (axis === 'y') this._yAxis -= number
  }
}

class I_Piece extends Piece {
  constructor() {
    super(
      [
        [0, 1, 0, 0],
        [0, 1, 0, 0],
        [0, 1, 0, 0],
        [0, 1, 0, 0],
      ],
      'I',
    )
  }
}
class J_Piece extends Piece {
  constructor() {
    super(
      [
        [0, 1, 0],
        [0, 1, 0],
        [1, 1, 0],
      ],
      'J',
    )
  }
}
class L_Piece extends Piece {
  constructor() {
    super(
      [
        [0, 1, 0],
        [0, 1, 0],
        [0, 1, 1],
      ],
      'L',
    )
  }
}
class O_Piece extends Piece {
  constructor() {
    super(
      [
        [1, 1],
        [1, 1],
      ],
      'O',
    )
  }
}
class S_Piece extends Piece {
  constructor() {
    super(
      [
        [0, 1, 1],
        [1, 1, 0],
        [0, 0, 0],
      ],
      'S',
    )
  }
}
class T_Piece extends Piece {
  constructor() {
    super(
      [
        [0, 1, 0],
        [1, 1, 1],
        [0, 0, 0],
      ],
      'T',
    )
  }
}
class Z_Piece extends Piece {
  constructor() {
    super(
      [
        [1, 1, 0],
        [0, 1, 1],
        [0, 0, 0],
      ],
      'Z',
    )
  }
}

class Smile_Piece extends Piece {
  constructor() {
    super(
      [
        [0, 0, 0, 0, 0, 0],
        [0, 1, 0, 0, 1, 0],
        [0, 1, 0, 0, 1, 0],
        [0, 0, 0, 0, 0, 0],
        [1, 0, 0, 0, 0, 1],
        [0, 1, 1, 1, 1, 0],

        // [0, 1, 0, 1, 0],
        // [0, 1, 0, 1, 0],
        // [0, 0, 0, 0, 0],
        // [1, 0, 0, 0, 1],
        // [0, 1, 1, 1, 0],
      ],
      'J',
    )
  }
}

class Dead_Piece extends Piece {
  constructor() {
    super(
      [
        // [0, 0, 0, 0, 0, 0],
        // [0, 0, 0, 1, 0, 0],
        // [0, 1, 0, 1, 0, 0],
        // [0, 0, 0, 0, 0, 0],
        // [0, 1, 1, 1, 1, 0],
        // [0, 0, 0, 0, 0, 0],

        [0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0],
        [0, 1, 0, 0, 1, 0],
        [0, 0, 0, 0, 0, 0],
        [0, 1, 1, 1, 1, 1],
        [0, 0, 0, 0, 0, 0],
      ],

      'I',
    )
  }
}

export const PieceMap: Record<number, any> = {
  0: I_Piece,
  1: J_Piece,
  2: L_Piece,
  3: O_Piece,
  4: S_Piece,
  5: T_Piece,
  6: Z_Piece,
  98: Smile_Piece,
  99: Dead_Piece,
}
