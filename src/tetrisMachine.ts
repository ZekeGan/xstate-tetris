import { EventObject, fromCallback, setup, sendTo, or } from 'xstate'
import { Piece, PieceMap } from './utils/Pieces'
import { Place } from './utils/Place'
import { animationDuration, downSpeed, pieceCode } from './config'
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
      const { coordinates, pieceType } = context.currentPiece
      const code = pieceCode.static[pieceType]
      context.place.setMovingPieceStatic(coordinates, code)
    },
    generateNewPiece: ({ context }) => {
      const randomNum: number = Math.floor(Math.random() * 7)
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
      const { coordinates, pieceType } = currentPiece
      const code = pieceCode.moving[pieceType]

      place.renderPlace(coordinates, code)
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
    setDeadFace: ({ context }) => {
      context.currentPiece = new PieceMap[99]()
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
  /** @xstate-layout N4IgpgJg5mDOIC5QBUwBcBOBLWA6AcmAO4AEA4gIYC2YAxGQIICyAogPoDKyDASsgNoAGALqJQABwD2sLGiySAdmJAAPRAFYATABoQAT0QAOAIy4ALAE4rAZgBs69bc3GnAX1e7UmHLgCSCkgAFDEkoDDhYWg5AlhYAEQBVQLY4gHkAdXwhUSQQKRk5RWU1BGNBTXVzdWsXM2NNAHZDS3VdAwRNCwbcTUFrQQsBsybbWwszd090bDx-IJCwiKiAGQyklIyskWV82XklXJKyxtx1Br71M1tDQ00bhrbEXtNNSwtjC2szZudbSZAvDM-AFgqFwrBIshfABhADS2R20j2RUOiHqD30iAaZmsuEMFls1i0+LqznU-0BPjmoMWENw0IAFmAAMYAaxIvlgJAYaBIACFJGg0JIqLQEbldoUDqASt8LHiGupBMYGsZLE5Gq1MQgrJVNJ1BLZDeVRs0KdMqSCFuC8IyWezOdzeQKhSKxcYchIkVLiog5QqlSq1QT9YrHghDA1utZ9e9XoJ1CZDObvLMrWCIvSmWyOVyefzBcLRfxNJ68t79r6EP7I4HVerQ1r2sYW7jjESzMSfoIzBMPACLWn5hm6Xac47llgFHRxV6CpXUTrrN1OzHXjdemczOG1S5cNitLZhpprtjNCmgdTrZmxw6uZPp+6y5KFzLEJ8V9V9d9bgnseGj0EXA13xXoGisY4L0tYdaVtCgABtmQAV3gig0DAEgOGZSRwjFbYJQrFE3w6Z5TmMM58TGQxDybNFrEjHpBBuWwVX1dtk37SkhxpG16QQ5DUPQzDsNw-gPUReciNUJ5SPUcimgJCxqJPWjShPeV+leMZe2NfUoO4686UIUgeEkJCFAgPDn0I6VpJIlsyIoxTlPscMtE0XB7CcBpvLVFjjH04EYN44ySFM8zLLE6zJNso4vlxCivmxHEjWsAC6lwciNUudtXi+QKrxHW1FEwSR4NoHhUm4ZAWFncsYqrFx1HlYxa36WxsWaL5wxMMxMsca5BAaV5VWXAr01g+kSpCcqmFSAA1dhlhYAAxAR8LnZFYrRewWraw1OpxbdtXeICyi6TSkxcaxxuCm9prK2g5sWtgeF8MgAAl1uirbGt2zL9o674jp3QRDVwQ0DVakwT3I26ePuhRSvKuJKuSNJMjql8pLiq4IeGZVdSYpTbHDBprFxZpCUjbyTw6+HDNtbM7xIVIkN5VIADMCwwCAwAwKyJN+xcmr2xV2sO7rtRbcoIfI25PgJcoVQZoqs3tXNWfZ1nuYFXn+afIWfRF64PPOGplzMRojx8ndnHlCx9TYjrFTOc9OMHIKEdHZnNbZjndZwvmBZLH7jeIlUcWA5qzGVrQKdeMn9X3PpOxxQxl1VP4PdTXBKBoVmADcDZ4FguF4ZA2EYVgsZsqsTyY-d7EjMpmqNUntUsboOoJawCXbLQApzoEGAULAqDQ-ZaAYaEoXmhgarYaFloYLYw9fOytB3LRunAtiBkuIkGncfsFEkPn4FyLijY32VwwAWlsCGwZf1+wbKY-h58UL87AG+caeApU44wgxRhaBnNy5FgKxnIuUOw8DVawX-ttBA4FwyZ36k4coOJHBKkVIg3it5Nb5hdEWZB9dVS4AJLWVilgcRpW1D5bo9Q7jjBuD2Dq7spi50KpNIhE4px-wIg1Rc5Mn74kNISI09QqbhkGG2AY-QeySP7gQm8-EUJoQwlhHCQjNrhzsi2b4nk5IVEMEeWObsdx1D6rqTovQugak-twy8E0QrEDCmZCy5CRZlCAp0MYVhqJOAYe0OSpgvJNX6PLPSX8DJq2hA9eCPiI5KiflbXoYNlyH1CViM4ENhqO37nYeo2cXHQW9kzDWjp-Y6x5sHFJhjHZP16DGCC1xmiGDkUSOWlhygVAJN8MpA5c6-yLvzRpJR4xATavRCmeCMTtC7uYSGbt2EgL7OUvAo9x6TyktjFBmh6IzMGCYQmipyg7j7pUOoHwOpjByn2dwQA */
  id: 'Tetris',
  context: {
    place: new Place(),
    currentPiece: new PieceMap[98](),
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
      entry: 'setDeadFace',
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
