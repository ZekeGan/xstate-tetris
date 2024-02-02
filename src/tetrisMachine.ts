import { EventObject, fromCallback, setup, sendTo, or } from 'xstate'
import { animationDuration, downSpeed, pieceCode } from '@/config'
import { Piece, PieceMap } from '@/utils/Pieces'
import { CoordinateType } from '@/type'
import { Place } from '@/utils/Place'

const getAudioSetVolumn = (src: string) => {
  const audio = new Audio(src)
  audio.volume = 0.7
  return audio
}

export const tetrisMachine = setup({
  types: {} as {
    context: {
      place: Place
      currentPiece: Piece
      popupText: string
      pieceQueue: Piece[]
      bgm: HTMLAudioElement
      se: {
        move: HTMLAudioElement
        drop: HTMLAudioElement
        cleanLine: HTMLAudioElement
        rotate: HTMLAudioElement
        over: HTMLAudioElement
      }
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
      }, animationDuration - 50)
      return () => clearTimeout(timer)
    }),
  },
  actions: {
    // audio
    playBGM: ({ context }) => context.bgm.play(),
    resetBGM: ({ context }) => {
      context.bgm.pause()
      context.bgm.currentTime = 0
    },
    playMove: ({ context }) => context.se.move.play(),
    resetMove: ({ context }) => (context.se.move.currentTime = 0),
    playDrop: ({ context }) => context.se.drop.play(),
    resetDrop: ({ context }) => (context.se.drop.currentTime = 0),
    playRotate: ({ context }) => context.se.rotate.play(),
    resetRotate: ({ context }) => (context.se.rotate.currentTime = 0),
    playCleanLine: ({ context }) => context.se.cleanLine.play(),
    playOver: ({ context }) => context.se.over.play(),

    // control
    moveDown: ({ context }) => context.currentPiece.moveDown(),
    moveRight: ({ context }) => context.currentPiece.moveRight(),
    moveLeft: ({ context }) => context.currentPiece.moveLeft(),
    rotatePiece: ({ context }) => context.currentPiece!.rotate(),
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

    // collide operation
    movePieceWhenOutOfRange: (
      { context: { place, currentPiece } },
      { axis }: { axis: 'x' | 'y' },
    ) => {
      if (place.outRangeLength === 0) return
      currentPiece.moveAxisByNumber(axis, place.outRangeLength)
    },
    restorePieceCoordinates: ({ context }) => context.currentPiece.restoreHistory(),

    // render
    setPieceStatic: ({ context }) => {
      const { coordinates, pieceType } = context.currentPiece
      const code = pieceCode.static[pieceType]
      context.place.setMovingPieceStatic(coordinates, code)
    },
    renderPiece: ({
      context: {
        place,
        currentPiece: { pieceType, coordinates },
      },
    }) => {
      const code = pieceCode.moving[pieceType]

      place.renderPlace(coordinates, code)
    },
    generateNewPiece: ({ context }) => {
      while (context.pieceQueue.length <= 10) {
        const randomNum: number = Math.floor(Math.random() * 7)
        context.pieceQueue.push(new PieceMap[5]())
      }

      context.currentPiece = context.pieceQueue.shift()!
    },

    // calculate score
    calcScore: ({ context }) => context.place.calcScore(),
    TSpinCalc: ({ context: { place } }) => place.calcTSpineScroe(),
    assignPopupText: ({ context }, { popupText }: { popupText: string }) => {
      let text = popupText

      if (text === 'TSpin') {
        const tSpinPopup: Record<number, string> = {
          1: 'T Spin',
          2: 'T Spin ×2',
          3: 'T Spin ×3',
        }
        text = tSpinPopup[context.place.lineIndexes.length]
      }

      if (text === 'normal') {
        const normalPopup: Record<number, string> = {
          1: 'Good',
          2: 'Double!',
          3: 'Triple!!!',
          4: 'Tetris!!!!',
        }
        text = normalPopup[context.place.lineCount] || 'Error'
      }
      context.popupText = text
    },

    // clean
    cleanLine: ({ context }) => context.place.cleanLine(),
    cleanPlace: ({ context }) => (context.place = new Place()),

    setDeadFace: ({ context }) => (context.currentPiece = new PieceMap[99]()),
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
    'is T Spin': ({ context: { currentPiece, place } }) =>
      place.checkIsTSpin(
        currentPiece.controlHistory,
        currentPiece.coordinateOfEmptyMatrix,
      ),

    'is game over': ({ context: { currentPiece, place } }) =>
      currentPiece.yAxis === 0 && place.checkIsPiecesCollide(currentPiece.coordinates),
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QBUwBcBOBLWA6AcmAO4AEA4gIYC2YAxGQIICyAogPoDKyDASsgNoAGALqJQABwD2sLGiySAdmJAAPRAFYATABoQAT0QAOAIy4ALAE4r6gOwBmC+sGCbxiwF93u1Jhy4AkgokAAoYklAYcLC0HMEsLAAiAKrBbAkA8gDq+EKiSCBSMnKKymoIxoJmAGy4hhaGdmaNVZrqVeq6BgiaFja4NoJ2Lm5m6k6aZp7e6Nh4gSFhEVExADJZKWlZOSLKhbLySvllFZa4gsZjdup2FYM2VZ2Imue4E1ZmDR+CFoLqhlMgHyzAJBULhSKwaLIfwAYQA0rldtJ9iUjohjJobI9yhiLLgqhiXDZRmNflUAUC-PMwUtIbgYQALMAAYwA1iR-LASAw0CQAEKSNBoSRUWiI-J7YqHUBlMw2PGGYm9YlNKoWHoPfTozR2GpmMzGdp2GwDKo2TSaCkzKmgxYQvCMlnsznc3kCoUisXGPISZFS0qIOUKpUm-W69UWTVdYwxvrXS46tWGA1W3xzW3gqL0plsjlcnn8wXC0X8TQ+gp+g4BhBB2ohlXhjXY4xXdS4RqGSoWA0WC4TVPA6l2rOO3MulZYBR0cW+opVtEIRVxgaY6pmlpR9FytvqXo-OwTZMx9QDm0LTN00fOrkTqde8uS+cyowm3C2QSrqrrzSbhBftsHpoipWA4BLtKe6bnrSDoUAANsyACusEUGgYAkBwzKSJEYo7BKlaos+3QTGY7b1K0ljkVoZjNvqO4Em03ZmD+3YQSCUH2vScGIchqHoZh2H8N6SJzgRqhPMRpGGOR6rqKMEzNgeNTtLJXwGoYLSTF4gLWpBNIcYQpA8JICEKBAOEPvh0piURsmSdJlHyVqCBUfi8oEs01S4qxQ4XngBkkEZJlmYJFkiVZxxAXYrnGCYggmDYbTGNiPyCLUYwmN2bT3P8WmUrpw6XoomCSLBtA8Ok3DICwM4VmF1aGlJZwtLq3w2MmdjYq4mi4BcVSCMpGJVEx5K5TpbF6SORVhKVTDpAAauwKwsAAYgIuGzii4XolUjX9YmrXtdi6ndeoFzGrJwE9Ceo1puNBUOlNJW0LNC1sDw-hkAAEmtoWbfVO3dXtLW9IdTkVBidYfBafwDCmN2Dhm0H0o9pUJOVqQZNkNWPqJEXqT1Zi-IYJhOH8YzJdUaV-HFUkfoYp3eYjHFXnmJDpAhvLpAAZoWGAQGAGDmcJf0Lg1gPNX1INNM2hpRTqBoHm0OqYh48NnhNl45tebMc2zPMCnzAv3sL-qiwMO4mlY9R-ITB7Nq0bYxa4ji-KdbWM+xI5a6z7Oc-rWH84Lpa-abhHGPcNQTG4vYVFJDjYl+NS9ZoLaYj0lg5dMt2UDQbMAG5GzwLBcLwyBsIwrDY5Z1Y-g4ry2LuX6E2qWJOVo3VMZG4duAewGsQwChYFQKEHLQDAwtCc0MFVbAwktDDbCHT7WVozZ-En+qRvu1zGp4WkKJI-PwPkeUm8vsrYgAtG2Vu33fjg2Kx-k52AZ+408tNnJbnYXAMGIdG3Qm7YLR1GeB+cOlo1b5V8m-LaCB5TYmNEnJWQ0ThSRaB7DWDpvYugLO6YssCa6uFwJGRUTFdwxnDglGW1wzjE1kgw9BmD7rZidKzW8r88J1QXOaGodQib6nsJiYmNC8QfHplYcG1x9TMN8pxeCSEUJoQwlhThG1Q7WVjoYfolgt4XHqG1Gi9hahBgStcOo9RM7aVuj5JG-lAqmUIaLSoqVm6tF6sSD8rcujXCUkrYwQYPgWCuLIpGMIUZOLDqMGoTgTRuAuLJB2R1IwkM7CTFW9QmihOZjgrkvs9a80DpEzRW8v6dl1AxdUhgE6dlePUPc1wWw7VVlnYEL984C2KWUCYNx2zEjanYBwyY0nYnbuYPaCT0rtE0q0vwA8h4j1EjjOBEwdT9CEYaZ4kYOpg31KYH81Q4o-guITSBnggA */
  id: 'Tetris',
  context: {
    place: new Place(),
    currentPiece: new PieceMap[98](),
    popupText: '',
    pieceQueue: [],
    bgm: new Audio('public/audio/Tetris.mp3'),
    se: {
      move: getAudioSetVolumn('public/audio/move.mp3'),
      rotate: getAudioSetVolumn('public/audio/rotate.mp3'),
      drop: getAudioSetVolumn('public/audio/drop.mp3'),
      cleanLine: new Audio('public/audio/clean.mp3'),
      over: new Audio('public/audio/over.mp3'),
    },
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
      entry: 'playBGM',
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
              actions: { type: 'movePieceWhenOutOfRange', params: { axis: 'y' } },
              target: 'Check Is Line',
            },
            {
              guard: 'is collide Piece',
              actions: 'restorePieceCoordinates',
              target: 'Check Is Line',
            },
            {
              target: 'Control',
            },
          ],
        },
        'Check Is Line': {
          entry: 'setPieceStatic',
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
                { type: 'assignPopupText', params: { popupText: 'TSpin' } },
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
          entry: 'generateNewPiece',
          always: [
            {
              guard: 'is game over',
              actions: 'renderPiece',
              target: '#Tetris.Game Over',
            },
            { target: 'Control' },
          ],
        },

        Control: {
          entry: 'renderPiece',
          on: {
            ROTATE: {
              actions: ['resetRotate', 'playRotate', 'rotatePiece'],
              target: 'Check Is Out Of Border',
            },
            MOVE_LEFT: {
              actions: ['resetMove', 'playMove', 'moveLeft'],
              target: 'Check Is Out Of Border',
            },
            MOVE_RIGHT: {
              actions: ['resetMove', 'playMove', 'moveRight'],
              target: 'Check Is Out Of Border',
            },
            DROP_DOWN: {
              actions: ['resetDrop', 'playDrop', 'dropDown'],
              target: 'Check Is At Bottom',
            },
          },
        },
        'Check Is Out Of Border': {
          always: [
            {
              guard: or(['is collide Right', 'is collide Left']),
              actions: { type: 'movePieceWhenOutOfRange', params: { axis: 'x' } },
              target: 'Control',
            },
            {
              guard: 'is collide Piece',
              actions: 'restorePieceCoordinates',
              target: 'Control',
            },
            {
              target: 'Control',
            },
          ],
        },
      },
    },

    'Game Over': {
      entry: ['resetBGM', 'setDeadFace', 'playOver'],
      on: {
        RESTART_GAME: {
          target: 'New Game',
          actions: 'cleanPlace',
        },
      },
    },

    Animation: {
      entry: 'playCleanLine',
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
