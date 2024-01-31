import { mapHeight, mapWidth } from '../config'
import { CoordinateType, PlaceType } from '../type'

export class Place {
  private _width: number = mapWidth
  private _height: number = mapHeight
  private _staticPlace!: PlaceType
  private _place!: PlaceType
  private _lineIndexes: number[] = []
  private _score: number = 0

  get place() {
    return this._place
  }

  get score() {
    return this._score
  }

  get lineIndexes() {
    return this._lineIndexes
  }

  private _generateEmptyPlace() {
    return Array(this._height)
      .fill([])
      .map(() => Array(this._width).fill(0)) as CoordinateType[]
  }

  constructor() {
    this._staticPlace = this._generateEmptyPlace()
    this._place = this._generateEmptyPlace()
  }

  // Place
  public renderPlace(currentPieceCoordinates: CoordinateType[]) {
    const newPlace = JSON.parse(JSON.stringify(this._staticPlace)) // deep copy
    currentPieceCoordinates.forEach(([y, x]) => {
      newPlace[y][x] = 2
    })
    this._place = newPlace
  }

  public setMovingPieceStatic(coordinates: CoordinateType[]) {
    coordinates.forEach(([y, x]) => {
      this._staticPlace[y][x] = 1
    })
  }
  // Check
  public checkPieceIsAtBottom(currentPieceCoordinates: CoordinateType[]) {
    const maxYaxisNumber = Math.max(...currentPieceCoordinates.map(([y]) => y))
    if (maxYaxisNumber > this._height - 1) return true
    return false
  }

  public checkIsPiecesCollide(currentPieceCoordinates: CoordinateType[]) {
    let isCollide = false

    currentPieceCoordinates.forEach(([y, x]) => {
      if (this._place[y] && this._place[y][x] === 1) return (isCollide = true)
    })
    return isCollide
  }

  public checkPieceIsOutOfBorder(currentPieceCoordinates: CoordinateType[]) {
    let isOut = false
    currentPieceCoordinates.forEach(([y, x]) => {
      if (x < 0 || x > this._width - 1) {
        isOut = true
        return
      }
    })
    return isOut
  }

  public checkIsLine() {
    this._staticPlace.forEach((y, yIndex) => {
      if (y.every((x) => x === 1)) {
        this._lineIndexes.push(yIndex)
      }
    })

    return this._lineIndexes.length !== 0
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

  public calcScore() {
    if (this._lineIndexes.length === 0) return 0
    let score = 0
    let pointer = 0
    let streakMultiplier = 1

    while (pointer < this._lineIndexes.length) {
      score += 1 * 100 * streakMultiplier
      if (this._lineIndexes[pointer] + 1 === this._lineIndexes[pointer + 1]) {
        pointer += 1
        streakMultiplier += 0.2
        continue
      }
      streakMultiplier = 1
      pointer += 1
    }
    this._score += score
  }
}
