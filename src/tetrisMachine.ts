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
        context.pieceQueue.push(new PieceMap[randomNum]())
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
  /** @xstate-layout N4IgpgJg5mDOIC5QBUwBcBOBLWA6AcmAO4AEA4gIYC2YAxGQIICyAogPoDKyDASsgNoAGALqJQABwD2sLGiySAdmJAAPRAFYATABoQAT0QAOAIy51gi4MMA2TdYDMAdmOb1AXze7UmHLgCSCiQAChiSUBhwsLQcQSwsACIAqkFs8QDyAOr4QqJIIFIycorKagjGgo4AnLiCmo4ALPWO9pqClfXG6roGCJqVjriOgvbGxo6ulcb11o0eXujYeAHBoeGR0QAymcmpmdkiygWy8kp5peUmuFPTdi6C1sbWXfqIraauljOV38aG9nMgbyLfyBEJhCKwKLIPwAYQA0jlDtJjsUzogXI5uujRtYrvZ1A11IYrNZvu5PICFr5lmC1pDcDCABZgADGAGsSH5YCQGGgSAAhSRoNCSKi0RF5I5FU6gUpNaqGRzmexWeqGOpWLFlVrVNWGRWaFrWJ6CeoAoHU0GrCF4Jmsjlcnl8wXC0Xi4y5CTI6UlRDy3CK5Wq9VDQxa0ZjMz4pWaOqGLRq81UpZW8GRBnM9mc7m8gVCkVi-iaT35b0nX0If2B4bBjVhl5lFWmRrGb6GhqORzWJM+FMrNP0u1Zx0bLAKOgSr2FctohDtUzqkx-UnqB6dcP1Ow1An2ezx9oNCo94E063pocO7mj8fuktSmeyxDzgOaJf2Fdr549Y3qXAtPpOG2nTqMYx6Wv2dK2hQAA2LIAK7QRQaBgCQHAspIETigckplqij69Cqhi4E8DjNEqaqVKa4b2JUuK1CSVQgaM-RgX2tI2gyMHwYhyGoehmH8B6SLTnhqivIRxGrk4TjqBRVENhiAyjPU6j9LYZLvqxIIQRxhCkDwkhwQoEBYXeuEymJBG-JJpEyXJ9RagmxFVM4xhNpuslaaeA54HpJAGUZJmCWZIkWec9hNLglR9Iq8bWPGtRfk+FgBuoqntFYLQ2GaFIWmxZ6DoomCSNBtA8Gk3DICwk6lqFFZjNMf6tGqMwtSSWrOJoVyrnYjSGGqIzdrlybaex55FaEpVMGkABq7AbCwABiAjYVOKJheiDS4i0prZW1NhajYXUgauWjDPFjTkvMvajQVtoTSVtDTXNbA8H4ZAABIrSF631VtTW7a1NjtQpgguAGDRtlYsZPF5qaQQyD2lfE5UpOkWQ1feonheYf6VMDDxaDR8Zau0uJxdDrhElMV2Ujd3kIxe2YkGkcF8mkABmeYYBAYAYKZwm-bODXbc1e3AwdCmPPYuCGvUu6aBi8VpXDOnnpml4s2zLNc4KPN87egs+sLXYKu+mj1P0DVNOGVNXIGTS-IY3y2KrY2DhrzOs+zusYbz-NFj9xv4b8KpmBYdjEq+5RJQgxq4p0tjOC0sn6jl13ApQNAswAbgbPAsFwvDIGwjCsJj5kVhqMsnZbRLQ61jmxrgm79Ka9zRbcWkMAoWBUEhJy0AwMLQjNDBVWwMILQw+xBw+llaOG6jvsRpqtk8lT4mDHgUgoki8-AeR5Ub89ylqAC0Q0Z74flZ2AJ-Y68ad-vi-TO3Ye71j0smCE1AF9G0Y0ww3Z3QfhtBAVQtROATj1V8YM-gNEMCAnyGZ7TM1zC6AsYCq7OCivFTsVR+iOH6pUcMblqgPENG0VwKpKJXzpieeGHEmYjjHPfHCdVZzjHJnQmKFsaE6ClmHCKq4xhOHgYmYa9MmHni4ghJCKE0IYXYWtYOllRjLxqBUWinZBDL1XNYDcFs-wVF3G5WwskpjIIRn5AKxlsHC3KPUYiMxWwRn6tYcYjkV4kVcPqSoWg-jWOYUjBxIczqDCeFUNoxCxGx2drifGTiKiGlkipYJ6s0GOm9jrbm-swmWVaLuF+1grCyQtqpYwWp4q-z6JMFUhJVzNC0nfXOfMCmlAtgE4iRo5blFojbBsltcT1HuHUaYxCVS7noXlXAPc+4D1EljcBFt9Q1BGCBBwwx5zUUmIMQ0VtOqPB3m4IAA */
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
          entry: ['playBGM', 'generateNewPiece'],
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
      entry: ['renderPiece', 'playCleanLine'],
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
