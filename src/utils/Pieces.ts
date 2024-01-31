import { CoordinateType, Matrix, MatrixHistory } from '../type'

class Piece_Basic {
  protected matrix: Matrix
  protected xAxis: number = 4
  protected yAxis: number = 0
  protected pieceHistory: MatrixHistory[] = []

  constructor(matrix: Matrix) {
    this.matrix = matrix
  }

  protected _getCoordinates() {
    return this.matrix
      .map((y, yIndex) => {
        return y.map((x, xIndex) =>
          x !== 0 ? [yIndex + this.yAxis, xIndex + this.xAxis] : undefined,
        )
      })
      .flat()
      .filter((x) => x) as CoordinateType[]
  }

  protected _rotate() {
    const rows = this.matrix.length
    const cols = this.matrix[0].length

    // 創建一個新的矩陣，用來存儲旋轉後的結果
    const rotatedMatrix = new Array(cols).fill(0).map(() => new Array(rows).fill(0))

    // 進行旋轉計算
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        rotatedMatrix[j][rows - 1 - i] = this.matrix[i][j]
      }
    }

    this.matrix = rotatedMatrix
  }

  protected _saveHistory() {
    this.pieceHistory.push({
      matrix: this.matrix,
      xAxis: this.xAxis,
      yAxis: this.yAxis,
    })
    if (this.pieceHistory.length > 10) {
      this.pieceHistory.unshift()
    }
  }
}

export class Piece extends Piece_Basic {
  constructor(matrix: Matrix) {
    super(matrix)
  }
  /**
   * get the coordinates of current piece
   */
  public getCoordinates() {
    return this._getCoordinates()
  }
  /**
   * rotate the current piece
   * @returns void
   */
  public rotate() {
    this._saveHistory()
    this._rotate()
  }
  /**
   * move the current piece to right
   */
  public MoveRight() {
    this._saveHistory()
    this.xAxis = this.xAxis + 1
  }
  /**
   * move the current piece to left
   */
  public MoveLeft() {
    this._saveHistory()
    this.xAxis = this.xAxis - 1
  }
  /**
   * move current piece down
   */
  public MoveDown() {
    this._saveHistory()
    this.yAxis = this.yAxis + 1
  }

  public restoreHistory() {
    if (this.pieceHistory.length === 0)
      throw new Error('PieceHistory does not have any history')
    const { matrix, xAxis, yAxis } = this.pieceHistory.pop() as MatrixHistory
    this.matrix = matrix
    this.xAxis = xAxis
    this.yAxis = yAxis
  }
}

class I_Piece extends Piece {
  constructor() {
    super([
      [0, 1, 0, 0],
      [0, 1, 0, 0],
      [0, 1, 0, 0],
      [0, 1, 0, 0],
    ])
  }
}
class J_Piece extends Piece {
  constructor() {
    super([
      [0, 1, 0],
      [0, 1, 0],
      [1, 1, 0],
    ])
  }
}
class L_Piece extends Piece {
  constructor() {
    super([
      [0, 1, 0],
      [0, 1, 0],
      [0, 1, 1],
    ])
  }
}
class O_Piece extends Piece {
  constructor() {
    super([
      [1, 1],
      [1, 1],
    ])
  }
}
class S_Piece extends Piece {
  constructor() {
    super([
      [0, 1, 1],
      [1, 1, 0],
      [0, 0, 0],
    ])
  }
}
class T_Piece extends Piece {
  constructor() {
    super([
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0],
    ])
  }
}
class Z_Piece extends Piece {
  constructor() {
    super([
      [1, 1, 0],
      [0, 1, 1],
      [0, 0, 0],
    ])
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
}
