import { EventObject, fromCallback, setup, sendTo, or, assign } from 'xstate'
import { Piece, PieceMap } from './utils/Pieces'
import { Place } from './utils/Place'
import { animationDuration, downSpeed } from './config'
import { CoordinateType } from './type'

export const tetrisMachine = setup({
  types: {} as {
    context: {
      place: Place
      currentPiece: Piece
      popupText: string
    }
    events:
      | { type: 'GAME_START' }
      | { type: 'RESTART_GAME' }
      | { type: 'TICK' }
      | { type: 'ROTATE' }
      | { type: 'SPEEDUP_DOWN' }
      | { type: 'SLOWUP_DOWN' }
      | { type: 'MOVE_RIGHT' }
      | { type: 'MOVE_LEFT' }
      | { type: 'DROP_DOWN' }
      | { type: 'ACTIVATE_CLEAN' }
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
    animationTimerLogic: fromCallback<EventObject>(({ sendBack }) => {
      const timer = setTimeout(() => {
        sendBack({ type: 'ACTIVATE_CLEAN' })
      }, animationDuration)
      return () => clearTimeout(timer)
    }),
  },
  actions: {
    moveDown: ({ context }) => {
      context.currentPiece.moveDown()
    },
    moveRight: ({ context }) => {
      context.currentPiece.moveRight()
    },
    moveLeft: ({ context }) => {
      context.currentPiece.moveLeft()
    },
    rotatePiece: ({ context }) => {
      context.currentPiece!.rotate()
    },
    dropDown: ({ context }) => {
      const piece = context.currentPiece
      const place = context.place
      let coordinates: CoordinateType[] = piece.coordinates

      while (
        !place.checkPieceIsOutRange(coordinates, 'bottom') &&
        !place.checkIsPiecesCollide(coordinates)
      ) {
        piece.moveDown()
        coordinates = piece.coordinates
      }
    },
    setPieceStatic: ({ context }) => {
      // context.currentPiece.restoreHistory()
      const coordinates = context.currentPiece.coordinates
      context.place.setMovingPieceStatic(coordinates)
    },
    generateNewPiece: ({ context }) => {
      const randomNum: number = Math.floor(Math.random() * Object.keys(PieceMap).length)
      const newPiece = PieceMap[randomNum]
      context.currentPiece = new newPiece()
    },
    movePieceWhenOutOfRange: (
      { context: { place, currentPiece } },
      { axis }: { axis: 'x' | 'y' },
    ) => {
      if (place.outRangeLength === 0) return
      currentPiece.moveAxisByNumber(axis, place.outRangeLength)
    },
    restorePieceCoordinates: ({ context }) => {
      context.currentPiece.restoreHistory()
    },
    renderPiece: ({ context: { place, currentPiece } }) => {
      const current_coordinates = currentPiece.coordinates
      place.renderPlace(current_coordinates)
    },
    calcScore: ({ context }) => {
      context.place.calcScore()
    },
    TSpinCalc: ({ context: { place } }) => {
      place.calcTSpineScroe()
    },
    assignPopupText: ({ context }, { popupText }: { popupText: string }) => {
      let text = popupText

      if (text === 'normal') {
        switch (context.place.lineCount) {
          case 1:
            text = 'Single'
            break
          case 2:
            text = 'Double!!'
            break
          case 3:
            text = 'Triple!!!'
            break
          case 4:
            text = 'Tetris!!!!'
            break
          default:
            throw new Error('line count does not declare yet!!')
        }
      }
      context.popupText = text
    },
    cleanLine: ({ context }) => {
      context.place.cleanLine()
    },
    cleanPlace: ({ context }) => {
      context.place = new Place()
    },
  },
  guards: {
    'is collide Left': ({ context: { currentPiece, place } }) =>
      place.checkPieceIsOutRange(currentPiece.coordinates, 'left'),
    'is collide Bottom': ({ context: { currentPiece, place } }) =>
      place.checkPieceIsOutRange(currentPiece.coordinates, 'bottom'),
    'is collide Right': ({ context: { currentPiece, place } }) =>
      place.checkPieceIsOutRange(currentPiece.coordinates, 'right'),

    'is collide Piece': ({ context: { currentPiece, place } }) =>
      place.checkIsPiecesCollide(currentPiece.coordinates),

    'is line': ({ context: { place } }) => place.checkIsLine(),

    'is T Spin': ({ context: { currentPiece } }) => currentPiece.checkIsTSpin(),
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QBUwBcBOBLWA6AcmAO4AEA4gIYC2YAxGQIICyAogPoDKyDASsgNoAGALqJQABwD2sLGiySAdmJAAPRAFYATABoQAT0QAOAIy51gi4PUAWQQE5N1zZvUBfV7tSYcuAJIKSAAUMSSgMOFhaDkCWFgARAFVAtjiAeQB1fCFRJBApGTlFZTUEY0EXXGsAZgB2ADYqwWM7GsMqwzrdAwRNFtwawSrjQxdB62bDa3dPdGw8fyCQsIiogBkMpJSMrJFlfNl5JVySss0asxsa9Rq7YzKa+q7ETSbcUYt1Q3U6hrstaZAXjmfgCwVC4VgkWQvgAwgBpbJ7aQHIrHRDGM5PBA1azWXB1ax1XpNQQDOxVOwAoE+BZg5aQ3AwgAWYAAxgBrEi+WAkBhoEgAIUkaDQkiotERuX2hSOoBK1kMdlwhiugxaTiq1Sq6ixdj6zjsgh+bXGTipsxpoKWELwzLZnO5vP5QpFYolxhyEmRMuKiAVSpV5gpOM0mqq2qxKsMuCqzijxiJgmsn3N3nmVvBEUZLI5XJ5fMFwtF4v4mk9eW9h19CH9ytVwY1Wp1+nRdzquGM2tqpMMVk1qeBtOtWbtucdqywCjokq9BSraIQ5POuPUsZaFOMq6qWOMTlM1j+9iJL2cVQHlsWmYZo4dPInU-d5el87liCXlWTa5qG63WIJpljTQ2j1ZM7hGc900velbQoAAbVkAFdYIoNAwBIDhWUkcIJV2KVK1RV8ehefd6l7TsCTsA8dw3SpPmuFxNV3YwaggkEoJtRk4MQ5DUPQzDsP4D0kTnAjVGeYjKlIpoqgoqiW1KM5NAuZw6i+FUrlYocrzwQhSB4SQEIUCAcKffDZTEoi7kk1TpNkuwsS0Kp8W+TQwNJTtvk0jNoIIYgSH0wzjME0yRPMk4wzMawamaJMbBGWo-ycDtvmY2NWlAqYPEBC1ILpDiYUUTBJFg2geFSbhkBYGcK1C6sE3UJVd0ENoPPJXcakjTdKiNBrDA6dRzGGLz2JHQqQhKphUgANXYVYWAAMQEXDZxRML0TqBqO1sFrtTaqLdSsr47B+cpajsfrhry0aFCKibpvYHhfDIAAJJaQtWuqNsa7ahl2oZ9vkspmpjDE2lUyZ6hYrLqVy4drzG4raDiMrkjSTJqufUTwsJXAmgapN6mO4CsW-PEGqJRU2n6zzoZytiruvHNbxIVIEP5VIADNCwwCAwAwEzhI+hd6u+5rfoa-6OsBso8XqOppNXTcorPWm03puHbSZvMWbZlmuaFHm+cfQWfWF1SlI2jbrjuT4HB0QHT3xGpnHKF4ZOqOpLo17N7W11n2f1rDef50t3tNwjmOqGMXmub9SL1Tp5OdpzP1xBjand1jKBoFmADcjZ4FguF4ZA2EYVgMbM6sXAqaoLCi0N1Axez5IPaMnD+SY-nMOpO1YhgFCwKgUMOWgGBhaEpoYSq2BhOaGB2MOXwsrQd1XJSk2aRwRhsuooayhRJF5+Bchhk3l-lLEAFp20sO-7+atxVeBXTyGoMBz6x54BnbUYZITFwFNE7dCbu2QCwFNRqUmF7bSn81rYhbt0Wo0ZNy901E4DamgCQwJ8jebWBYXTFjgdXaKuAiatBkpglU4YSaqQ7HGB451GgdEMDg-KWtxyTg-nhWqC5vztkVEaRwu4TAyUQW+JM+J7BDHqg0XEUMZhqy0rgriSEUJoQwlhbhK1w4WTuAqfENcBrfBVAqbcgNxhKhxOYeiuImIKOyko7yHFX4BSMsQ4WQM3iiPOnvBqisHIYmcr3G4ZRwx1FuGw66t0PERx7jGNoxErjyOuCTT4uNnbqWioSBUT9FGDmcSODhPJ-Z625sHWJeiHDtlQZ8Do9QBoJl1LUXGIjmjywJASBxMNcDZzQqkfOGBKklFDIaMw6VSKZM+MAjQrkyFGmYkBIYVhMr5J8APIeI9RKY3gaGXsyom43GcGcK4bQdy2EEB2Xufj5ZXB+J7dwrggA */
  id: 'Tetris',
  context: {
    place: new Place(),
    currentPiece: new PieceMap[0](),
    popupText: '',
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
              guard: 'is collide Bottom',
              actions: [
                { type: 'movePieceWhenOutOfRange', params: { axis: 'y' } },
                'setPieceStatic',
              ],
              target: 'Check Is Line',
            },
            {
              guard: 'is collide Piece',
              actions: ['restorePieceCoordinates', 'setPieceStatic'],
              target: 'Check Is Line',
            },
            {
              actions: 'renderPiece',
              target: 'Control',
            },
          ],
        },
        'Check Is Line': {
          entry: 'renderPiece',
          always: [
            {
              guard: 'is line',
              target: 'Calculate Score',
            },
            {
              target: 'New Round',
            },
          ],
        },
        'Calculate Score': {
          always: [
            {
              guard: 'is T Spin',
              actions: [
                'TSpinCalc',
                { type: 'assignPopupText', params: { popupText: 'T Spin!!!' } },
              ],
              target: '#Tetris.Animation',
            },
            {
              actions: [
                'calcScore',
                { type: 'assignPopupText', params: { popupText: 'normal' } },
              ],
              target: '#Tetris.Animation',
            },
          ],
        },
        'New Round': {
          entry: ['generateNewPiece'],
          always: [
            {
              guard: 'is collide Piece',
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
              target: 'Check Is At Bottom',
            },
          },
        },
        'Check Is Out Of Border': {
          always: [
            {
              guard: or(['is collide Right', 'is collide Left']),
              actions: [
                { type: 'movePieceWhenOutOfRange', params: { axis: 'x' } },
                'renderPiece',
              ],
              target: 'Control',
            },
            {
              guard: 'is collide Piece',
              actions: ['restorePieceCoordinates', 'renderPiece'],
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

    Animation: {
      invoke: {
        src: 'animationTimerLogic',
      },
      on: {
        ACTIVATE_CLEAN: {
          actions: ['cleanLine', { type: 'assignPopupText', params: { popupText: '' } }],
          target: '#Tetris.In Progress.New Round',
        },
      },
    },
  },
})
