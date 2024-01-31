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
  },
  guards: {
    'is collide piece': ({ context: { currentPiece, place } }) =>
      place.checkIsPiecesCollide(currentPiece.getCoordinates()),

    'is out of Border': ({ context: { currentPiece, place } }) =>
      place.checkPieceIsOutOfBorder(currentPiece.getCoordinates()),

    'is at Bottom': ({ context: { currentPiece, place } }) =>
      place.checkPieceIsAtBottom(currentPiece.getCoordinates()),

    'is at Top': () => false,

    'is line': ({ context: { place } }) => place.checkIsLine(),
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QBUwBcBOBLWA6AcmAO4AEA4gIYC2YAxGQIICyAogPoDKyDASsgNoAGALqJQABwD2sLGiySAdmJAAPRAEYA7ABZcAVm0A2AByaAnACY9g4+u0BmYwBoQAT0S39g74Ltn1xsaGeoYAvqEuqJg4uACSCiQAChiSUBhwsLQciSwsACIAqolseQDyAOr4QqJIIFIycorKaghm5riaeprG9m2C9oYBZi7uCPYOuD7eFmZG3o5hESBR2HjxSSlpGVkAMhVFJRVVIsr1svJKtS1mnqbW2pqGFkED2iMaAfa4hpoBT+PqdT+RaRdCrOIJZKpdKwTLIWIAYQA0tVTtJzk0rhpBJp3q17OpcIDDDYzP5ARZBuFQdE1pDNjC8IRSDxJABXBQQWio2pnRqXUAtCyCElErQWbTGQSSvS2Qx4wHqL4-P7qQxkwGOanLMExdZQrawgjEEisjlc-jqGoSdH85oaCwWTS4SxtCUGMzeZxuRBtMyTSzBbQirqzCzalZ6+nQjK4BGKTCSAA2tB4pW4yBYPJtDQu9oQ6j09i+egs4x6IrMpaVeMMDxdIspEsdelL9gjurpGxjRvjCkTKaYpQAauwdiwAGICE68215rEFoslsuS+yV6v2PE6XT2PRmXoi9SOoId2kQ7uGvB9ge0Iejtg8WJkAAS0+tdTnmMFGiX+hXFfVDc8WMYNcFsKwAilYUgWMU9wX1BlY2vFIUzyNNijKSpsw-XMv1UB011wXoQJ0OsWxxYDjAsb5elLWVHhFEU4KjC9GTjAALMAAGMAGsSFiWASFKNk0CEgAzEgACFJAwCAwAwbkZxzDEBXwxcnm+Ot1EEfxNF8bQtDxfdnUpEIjA1ToBmYrsDTYhFON4-jBOE0TSgk6TZPk7krTRXDVJaQtiz-cs10Aiwax9AtBBmXBwtMTpfELKxtGs89bKQhy+IEoSRPEqSZLkhT+Asd8+Xnb9F38F0SRuUtHkMQx7FxSLWz0F0iyVbRgydKV2yWSMbMQ3tMqckgGFE6S0DQSQqEU0rP38xAut0O5EsPH5uma0ZtKsIigTi3x6LMVKEJ7K8Ruy8b8qmmbvPmvz82WsCEsBdbNE2oygoGEljDJMxBkrE7o0vDjuKywSrsm6bZuK+6VMerrnusV7Bg20wtwMoknn+v5BlIoHWIysHRp2LAFDobCyrwlo5TA547BA7SjACBV5iJTobnMWxg16An0uG4nstJ8m7t8+GF1pqjucZ6VBm9UYq2dLQ9yCdVNAlE9tQUSQ5PgWoBrFu0FwAWnlSLTdS5lyGoMBDfKtTtAsYDqKmfT-ECBq+aGvXlKNiq9zxR3CW0DqCSVLompBHUz1OkGrbNTk7ep312ga4NyTVR2A8i-djCIx3gkpaKV00L2zrjBMUKTxaC2DQQOmCBr1Y9dWt3VyY7DovQjw68N+s7NLvdBxzspcvKPMK6v8y0WYOn+ywuabd68T3L4cSsVtxneywUv7mPgbsi6IYmyQbqoKeFwg6q7hDsPi03HODH0QMix6-dHbLkH7MFwThdt2cHoLgaoYIkkoQ57h0N0R2RlBhgQLkWaszx1apUoDQISAA3eSF8KqOiPERWq0VjCtk9E6BUioXRxVRnYJUfVwhAA */
  id: 'Tetris',
  context: {
    place: new Place(mapWidth, mapHeight),
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
          entry: ['generateNewPiece', 'renderPiece'],
          always: [
            {
              guard: 'is at Top',
              target: '#Tetris.Game Over',
            },
            { target: 'Control' },
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
    'Game Over': {},
  },
})
