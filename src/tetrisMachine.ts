import { EventObject, fromCallback, setup, sendTo } from 'xstate'
import { Piece, PieceMap } from './utils/Pieces'
import { Place } from './utils/Place'
import { downSpeed, mapHeight, mapWidth } from './config'
import { CoordinateType } from './type'

export const tetrisMachine = setup({
  types: {
    context: {} as {
      place: Place
      currentPiece: Piece
    },
    events: {} as
      | { type: 'GAME_START' }
      | { type: 'RESTART_GAME' }
      | { type: 'TICK' }
      | { type: 'ROTATE' }
      | { type: 'SPEEDUP_DOWN' }
      | { type: 'SLOWUP_DOWN' }
      | { type: 'MOVE_RIGHT' }
      | { type: 'MOVE_LEFT' }
      | { type: 'DROP_DOWN' },
  },
  actors: {
    ticksLogic: fromCallback<EventObject>(({ sendBack, receive }) => {
      const tickTimer = (time: number) =>
        setInterval(() => sendBack({ type: 'TICK' }), time)
      let defaultTick: ReturnType<typeof setInterval> = tickTimer(downSpeed)
      let speedupTick: ReturnType<typeof setInterval>

      receive((event) => {
        clearInterval(defaultTick)
        clearInterval(speedupTick)
        if (event.type === 'SPEEDUP_DOWN') {
          speedupTick = tickTimer(downSpeed * 0.1)
        }
        if (event.type === 'SLOWUP_DOWN') {
          clearInterval(speedupTick)
          defaultTick = tickTimer(downSpeed)
        }
      })

      return () => clearInterval(defaultTick)
    }),
  },
  actions: {
    moveDown: ({ context }) => {
      context.currentPiece.MoveDown()
    },
    moveRight: ({ context }) => {
      context.currentPiece.MoveRight()
    },
    moveLeft: ({ context }) => {
      console.log('left')

      context.currentPiece.MoveLeft()
    },
    rotatePiece: ({ context }) => {
      context.currentPiece!.rotate()
    },
    dropDown: ({ context }) => {
      const piece = context.currentPiece
      const place = context.place
      let coordinates: CoordinateType[] = piece.getCoordinates()

      while (
        !place.checkPieceIsAtBottom(coordinates) &&
        !place.checkIsPiecesCollide(coordinates)
      ) {
        piece.MoveDown()
        coordinates = piece.getCoordinates()
      }

      piece.restoreHistory()
      const historyCoordinates = piece.getCoordinates()
      place.setMovingPieceStatic(historyCoordinates)

      if (place.checkIsLine()) {
        place.calcScore()
        place.cleanLine()
      }
    },
    setPieceStatic: ({ context }) => {
      context.currentPiece.restoreHistory()
      const coordinates = context.currentPiece.getCoordinates()
      context.place.setMovingPieceStatic(coordinates)
    },
    generateNewPiece: ({ context }) => {
      const randomNum: number = Math.floor(Math.random() * Object.keys(PieceMap).length)
      const newPiece = PieceMap[randomNum]
      context.currentPiece = new newPiece()
    },
    renderHistoryPiece: ({ context: { place, currentPiece } }) => {
      currentPiece.restoreHistory()
      const old_coordinates = currentPiece.getCoordinates()
      place.renderPlace(old_coordinates)
    },
    renderPiece: ({ context: { place, currentPiece } }) => {
      const current_coordinates = currentPiece.getCoordinates()
      place.renderPlace(current_coordinates)
    },
    calcScore: ({ context }) => {
      context.place.calcScore()
    },
    cleanLine: ({ context }) => {
      context.place.cleanLine()
    },
    cleanPlace: ({ context }) => {
      context.place = new Place()
    },
  },
  guards: {
    'is collide piece': ({ context: { currentPiece, place } }) =>
      place.checkIsPiecesCollide(currentPiece.getCoordinates()),

    'is out of Border': ({ context: { currentPiece, place } }) =>
      place.checkPieceIsOutOfBorder(currentPiece.getCoordinates()),

    'is at Bottom': ({ context: { currentPiece, place } }) =>
      place.checkPieceIsAtBottom(currentPiece.getCoordinates()),

    'is at Top': ({ context: { currentPiece, place } }) =>
      place.checkIsPiecesCollide(currentPiece.getCoordinates()),

    'is line': ({ context: { place } }) => place.checkIsLine(),
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QBUwBcBOBLWA6AcmAO4AEA4gIYC2YAxGQIICyAogPoDKyDASsgNoAGALqJQABwD2sLGiySAdmJAAPRAEYA7AE5cAVgAsANgAc2gMzatggEwH1RgDQgAnolM3c2m3pM7zBjZGNgEAvqHOqJg4uACSCiQAChiSUBhwsLQciSwsACIAqolseQDyAOr4QqJIIFIycorKagjqNtp6uAbmmno95m09fs5urbbmuFrqfpohs7ZG4ZHo2HjxSSlpGVkAMhVFJRVVIsr1svJKtS1t2pr6hprq5u2GBoKaIxrq6rrBBtraAwmIzmPQ+GxLEBRVZxBLJVLpWCZZCxADCAGlqqdpOcmldEJZPIC+sYgv8TIJ1J8EB4uv92m8HA5DJDoTF1vCtkjcKiABZgADGAGsSLFYCQGGgSAAhSRoNCSKi0LG1M6NS6gFqacyCXAmGyCcxGR4dAz-bTU0wGXBGAGgg06A2WVkrdlwzaIvB8wUisUSqWy+WK5XqGoSHHq5qIbW6-WG40-V4A6l6by4TTGH6CWx+A16F3RNbuhEZHn84Wi8WSmVyhVK-g2MN1CMXKMIGN6p0J03m6kmM24AI+bpWIyUvTqAswjke0veit+nZYBR0FXhhqt-GtdS2dPa4yCAx6PQfVzuYL3Mfa56aTSCIyTiJQ11FjYl7nz33ipcrkNNtWbpqXy7reARjkeJ6Wg4l5PK8pgmPmT5sq+nKegQxAkDwkgAK4KBAyonKqLZ4kBCBgtS6h9EYuDvBSvi3AMthTm6b5cnghCkFhuH4fwobYhuJGqBoE4TH4ei2NqdhWDY1J3p4wJjg4by9D85jMShs4foomCSAANrQPClNwyAsGuzYCRqQmtCYPxdPBNg2N8x5gqeowTnc2j3uoxgZoIYIOepsKsWhqLaSk+lMKUABq7A7CwABiAiEeuuKWdcNm6MYJj6o5lHHjYrnuN5g6pgMmjZaCnmLEhL5Bahc5hXptCRTFbA8LEZAABJJf+xFpRoGV2dlDlOflhXtjueqDBlFgOL0gUzu+XqNfpeSGcUZSVGZAGCdcE7UQEPSGDZlFmjJZ40veXRtP2YJGGa4kmAtxZsWWPqViQpTYVKpQAGY1hgEBgBgBG9RZbbTECNqCKaRjiceY7mH27y4EEzkDEaISps9wVzuWX6fd9n3-bKgPA3+-GpRDg1ZTlo0uX2AKo9MjwTsCJoQjVhZ1ZpXr4x9X0-STkhkyDDZg1TW4sx597PCeaO2Ho1KBJ0HQ6lYsygjqmiBZQNCfQAbuTPAsFwvDIGwjCsNtfUQzo+hZRYGu2PYTgXTZ+jZtm3lWNl92IU+CiSED8C1MhlORluAC0bujDHNFe4nScIYFHHkNQYAR4BVmBJavSDirR7eL02hPVz04vZ6We7QSA7EmBZKl5S1LtOoXR9N8VjTAaVg4-VH78361aBnW1f9WRPReN5O46kC3TArJfleD4CEryrfl97zb0Lt+y6Z0R4Nbh0ngw+YFLAmfqappajmow5vQ6vtwRl8s3OLa9adcXhY8Q2j0MWKzF4IQkYXTHAdMwR5vJmFHNVV+FdcZaQUDpXSP8pamGoo8U+JhLB+FBAYS0gQaLeTNG8bwIIwjlxYv3Pm70-SC2JgDIGGBUGkQNBSdMgRDrYLPlofBF1jATHeHYbBHRKTfE5nAmIeswCG2BiwqyBprQ2BsiEbyjlQSUhMBRMEJgOEGFmHaNortwjhCAA */
  id: 'Tetris',
  context: {
    place: new Place(),
    currentPiece: PieceMap[0],
  },
  initial: 'New Game',
  states: {
    'New Game': {
      on: {
        GAME_START: {
          target: 'In Progress',
        },
      },
    },
    'In Progress': {
      initial: 'New Round',
      invoke: {
        id: 'ticks',
        src: 'ticksLogic',
      },
      on: {
        SPEEDUP_DOWN: {
          actions: sendTo('ticks', { type: 'SPEEDUP_DOWN' }),
        },
        SLOWUP_DOWN: {
          actions: sendTo('ticks', { type: 'SLOWUP_DOWN' }),
        },
        TICK: {
          actions: 'moveDown',
          target: '.Check Is At Bottom',
        },
      },
      states: {
        'Check Is At Bottom': {
          always: [
            {
              guard: 'is at Bottom',
              actions: 'setPieceStatic',
              target: 'Check Is Line',
            },
            {
              guard: 'is collide piece',
              actions: 'setPieceStatic',
              target: 'Check Is Line',
            },
            {
              actions: 'renderPiece',
              target: 'Control',
            },
          ],
        },
        'Check Is Line': {
          always: [
            {
              guard: 'is line',
              actions: ['calcScore', 'cleanLine'],
              target: 'New Round',
            },
            {
              target: 'New Round',
            },
          ],
        },
        'New Round': {
          entry: ['generateNewPiece'],
          always: [
            {
              guard: 'is at Top',
              target: '#Tetris.Game Over',
            },
            { actions: 'renderPiece', target: 'Control' },
          ],
        },
        Control: {
          on: {
            ROTATE: {
              actions: 'rotatePiece',
              target: 'Check Is Out Of Border',
            },
            MOVE_LEFT: {
              actions: 'moveLeft',
              target: 'Check Is Out Of Border',
            },
            MOVE_RIGHT: {
              actions: 'moveRight',
              target: 'Check Is Out Of Border',
            },
            DROP_DOWN: {
              actions: 'dropDown',
              target: 'New Round',
            },
          },
        },
        'Check Is Out Of Border': {
          always: [
            {
              guard: 'is out of Border',
              actions: 'renderHistoryPiece',
              target: 'Control',
            },
            {
              guard: 'is collide piece',
              actions: 'renderHistoryPiece',
              target: 'Control',
            },
            {
              actions: 'renderPiece',
              target: 'Control',
            },
          ],
        },
      },
    },
    'Game Over': {
      on: {
        RESTART_GAME: {
          target: 'New Game',
          actions: 'cleanPlace',
        },
      },
    },
  },
})
