import { mapHeight, mapWidth } from '@/config'
import { CollideType, ControlHistory, CoordinateType, PlaceType } from '@/type'

export class Place {
  private _width: number = mapWidth
  private _height: number = mapHeight
  private _staticPlace!: PlaceType
  private _place!: PlaceType
  private _lineIndexes: number[] = []
  private _score: number = 0
  private _lineCount: number = 0
  private _outRangeLength: number = 0

  get place() {
    return this._place
  }
  get score() {
    return this._score
  }
  get lineIndexes() {
    return this._lineIndexes
  }
  get outRangeLength() {
    return this._outRangeLength
  }
  get lineCount() {
    return this._lineCount
  }

  constructor() {
    this._staticPlace = this._generateEmptyPlace()
    this._place = this._generateEmptyPlace()
  }

  private _generateEmptyPlace() {
    return Array(this._height)
      .fill([])
      .map(() => Array(this._width).fill(0)) as CoordinateType[]
  }

  private _getPieceBorderInfo(coordinates: CoordinateType[], collideType: CollideType) {
    let isOut = false
    const outRangeLengthList: number[] = []

    const collideFunctionMap: Record<CollideType, () => void> = {
      left: () =>
        coordinates.forEach(([, x]) => {
          if (x < 0) {
            outRangeLengthList.push(x)
            isOut = true
          }
        }),
      right: () =>
        coordinates.forEach(([, x]) => {
          if (x > this._width - 1) {
            outRangeLengthList.push(x)
            isOut = true
          }
        }),
      bottom: () =>
        coordinates.forEach(([y]) => {
          if (y > this._height - 1) {
            outRangeLengthList.push(y)
            isOut = true
          }
        }),
    }

    collideFunctionMap[collideType]()

    const outRangeMap: Record<CollideType, number> = {
      left: Math.min(...outRangeLengthList),
      right: Math.max(...outRangeLengthList) - (this._width - 1),
      bottom: Math.max(...outRangeLengthList) - (this._height - 1),
    }

    return {
      isOut,
      outRangeLength: outRangeLengthList.length === 0 ? 0 : outRangeMap[collideType],
    }
  }

  private _getCollidePieceInfo(coordinates: CoordinateType[]) {
    let isCollide = false
    let collideCount = 0

    coordinates.forEach(([y, x]) => {
      if (this._place[y] && this._staticPlace[y][x] > 20) {
        collideCount++
        isCollide = true
      }
    })

    return {
      isCollide,
      collideCount,
    }
  }

  private _calcNormalScore() {
    if (this._lineIndexes.length === 0) return { score: 0, lineCount: 0 }
    let score: number = 0
    let pointer = 0
    let streakMultiplier = 1

    const lineCount: number[] = []
    let temp = 1

    while (pointer < this._lineIndexes.length) {
      score += 1 * 1000 * streakMultiplier
      if (this._lineIndexes[pointer] + 1 === this._lineIndexes[pointer + 1]) {
        pointer += 1
        streakMultiplier += 0.2
        temp++
        continue
      }
      lineCount.push(temp)
      temp = 1
      streakMultiplier = 1
      pointer += 1
    }

    return {
      score,
      lineCount: Math.max(...lineCount),
    }
  }

  // Place
  public renderPlace(coordinates: CoordinateType[], pieceCode: number) {
    const newPlace = JSON.parse(JSON.stringify(this._staticPlace)) // deep copy
    coordinates.forEach(([y, x]) => {
      newPlace[y][x] = pieceCode
    })
    this._place = newPlace
  }

  public setMovingPieceStatic(coordinates: CoordinateType[], pieceCode: number) {
    coordinates.forEach(([y, x]) => {
      this._staticPlace[y][x] = pieceCode
    })
  }

  // Check
  public checkIsPiecesCollide(coordinates: CoordinateType[]) {
    return this._getCollidePieceInfo(coordinates).isCollide
  }

  public checkPieceIsOutRange(
    currentPieceCoordinates: CoordinateType[],
    collideType: CollideType,
  ) {
    const { isOut, outRangeLength } = this._getPieceBorderInfo(
      currentPieceCoordinates,
      collideType,
    )

    this._outRangeLength = outRangeLength
    return isOut
  }

  public checkIsLine() {
    this._staticPlace.forEach((y, yIndex) => {
      if (y.every((x) => x > 20)) {
        this._lineIndexes.push(yIndex)
      }
    })

    return this._lineIndexes.length !== 0
  }

  public checkIsTSpin(
    controlHistory: ControlHistory[],
    coordinateOfEmptyMatrix: CoordinateType[],
  ) {
    let isTSpin = false
    if (controlHistory.length === 0) return isTSpin

    const { collideCount } = this._getCollidePieceInfo(coordinateOfEmptyMatrix)
    for (let i = 0; i < 2; i++) {
      const { pieceType, control } = controlHistory.pop()!
      if (pieceType === 'T' && control === 'Rotate' && collideCount >= 3) {
        isTSpin = true
      }
    }

    return isTSpin
  }

  // line
  public cleanLine() {
    const newStaticPlace = this._staticPlace
    this._lineIndexes.forEach((y) => {
      newStaticPlace.splice(y, 1)
      newStaticPlace.unshift(Array(this._width).fill(0))
    })
    this._lineIndexes = []
    this._staticPlace = newStaticPlace
  }

  // Caculate
  public calcScore() {
    const { score, lineCount } = this._calcNormalScore()
    this._score += score
    this._lineCount = lineCount
  }

  public calcTSpineScroe() {
    this._score += 3000 * this._lineIndexes.length
  }
}
