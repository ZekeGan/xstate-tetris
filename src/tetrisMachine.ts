import { EventObject, fromCallback, setup, sendTo, or } from 'xstate'
import { animationDuration, downSpeed, pieceCode } from '@/config'
import { Piece, PieceMap } from '@/utils/Pieces'
import { Axis, CoordinateType } from '@/type'
import { Place } from '@/utils/Place'

const getAudioSetVolumn = (src: string) => {
  const audio = new Audio(src)
  audio.volume = 0.7
  return audio
}

const resetMusic = (music: HTMLAudioElement) => {
  music.pause()
  music.currentTime = 0
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
    resetBGM: ({ context }) => resetMusic(context.bgm),
    playMove: ({ context }) => context.se.move.play(),
    resetMove: ({ context }) => resetMusic(context.se.move),
    playDrop: ({ context }) => context.se.drop.play(),
    resetDrop: ({ context }) => resetMusic(context.se.drop),
    playRotate: ({ context }) => context.se.rotate.play(),
    resetRotate: ({ context }) => resetMusic(context.se.rotate),
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
      { axis }: { axis: Axis },
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
    renderPiece: ({ context: { place, currentPiece } }) => {
      const code = pieceCode.moving[currentPiece.pieceType]
      place.renderPlace(currentPiece.coordinates, code)
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
  /** @xstate-layout N4IgpgJg5mDOIC5QBUwBcBOBLWA6AcmAO4AEA4gIYC2YAxGQIICyAogPoDKyDASsgNoAGALqJQABwD2sLGiySAdmJAAPRACYAHAGZcAdgCsm9QBZTe9QE5t2vQBoQATw0HdANmsBGSzr0nLlm5u2gC+IQ6omDi4AJIKJAAKGJJQGHCwtBwJLCwAIgCqCWy5APIA6vhCokggUjJyispqCN5ugrjqBp6CNiaenurdBg7OCJ2auG6aFm3qPf6CmiZhEejYeHGJyanpmQAy5YXF5ZUiynWy8ko1zZ5+E4GexpYGbnd3Iy4TUzOCc9oLJYrECRdaxeJJFJpWAZZAxADCAGkqudpJdGjdEAN7E4sYJLCZcJo-p0TAY9JZvCY3MDQdFNpCdjDcPCABZgADGAGsSDFYCQGGgSAAhSRoNCSKi0FE1C4Na6gZomYy4QTeCyaTwGaw2Ya4lr4vS4AwGdRWLWmvQUvS0tb0iHbaF4Nmcnl8gVC0XiyXSzzVCRo+VNRD+XRWwwA6YLKafBA+CY9UwkxaebTTW1RDYOqHpFns7m8-mCkViiVS-jqf21QNXYMIU2EoZBAmWPSCbWeWOWTrGnx-SyLMmCCkZsEMx25l0F917LAKOgygP1WuYuMGQmaZ4mQRvNWpzv6gYeDoAtMtqwWUf2rY55lTt382fz31VuUrxWIAmeIkmNMzMmGDioz9AEkxuIYBj4sS2geAYV5ZjeTLOhQAA2HIAK4oRQaBgCQHAcpIaTSmcso1hiH5jNoiz6D0-RGNMTxuCYsYDHMNHqG0nhMYIarLOEIJ2ghjJOiyqEYVhOF4QRRH8H6qLLuRqgaFRExttodGbnojHMYeO6WLgWqBO2gS2B4mjweCiEiYQpA8JI6EKBAxGvmRCpKS0dyEq8Q5GOurGxqa37akEVgBA2BIWeOt54DZJB2Q5TmyS5ClubcTzfsEyo2AOlLaASsZuOouhcYMejaNqOhuK4kXZkhLKKJgkgobQPAlNwyAsIu1YpXWWpWrg3bkgObR9BaBVqrgeVTDoixpkV6g1VZk4NckzVMCUABq7B7CwABiAgkUu6KpVifj6eprx6JoTEcYs6jje0UzWG013qBYnSLcJy0KI1a2bewPAxGQAASB3JcdvV-sagymFoZXrjY43flNm4qXN2gLfxdJCROd4rU1tC5K1RSlBUXVvopzQwQm5JXfDVX+fqhhuLgfTDtxqYpp9uPOvmD4kCU6FCiUABmJYYBAYAYM58kQ6u3iUpNejgU8rhBMEeqjN2DwmGVSbdFVWnc9FeauoWAtCwLYuihLUsvrLQarnMPQGQCJrbn0Z6a3itgdAELzGd5NpY4JllfXefPm4LwvW4RkvSxW4OOxR-y6NSHEVX4Z4sZ4ZKqn01J-P0xJ8asma4JQNACwAbnbPAsFwvDIGwjCsOTrl1kx52apqX5poIOnAW0qpRlVBJzGzpcCeXDAKFgVDYVctAMPCcIbQwHVsPCO0MKcSfvu5AC02oDTuv6c9uOjdixv7tK41IBDuSy-uZwIKJIkvwDU2MOwfzSH90I0w1z5UUvnle6+pfwDVPBjbwrwliagsrFSuYBf6U0QFRdQBllRklbJBM6QEsTEmgefAumhKTkNCCHcuUUkJoJOggCksYYK6B0L5MwJphy62NnVe85tixejLPQusb1vyBGmAOK6AQdAQOAgMdwQQozrgHDYV+Zcxy1REnwmcc5UGkR6quLSLMB4EkWGqK6wQ3AsVJJMfcb0OLKn6MHdR15w7ITQphbCuF8KET0UdZO7l+i6wGn0K0+Jyo7nKtYoIA1n5-B6Coo21CNFLWZLFeKjlhGrnIfpAYXQuLWGurg2M-gJi6meOVQqWop7YzDjzeqP1VpZIov0Yeb1XBLDum2D4+pjDfjmMSbUfRoI7h4VoyO7po5W3FvHZpgSCRGjaACLSTxlSUm9ggII35c5-FsFdEwZIDkWRQTXKWcy0pmGNHrQwPRrr4lkVidSrMYFDACNaCys956L0UhTBhnRhwGU1OpXWFJiTDhYjBAw+dCrUhNKaNUNIwghCAA */
  id: 'Tetris',
  context: {
    place: new Place(),
    currentPiece: new PieceMap[98](),
    popupText: '',
    pieceQueue: [],
    bgm: new Audio('/audio/Tetris.mp3'),
    se: {
      move: getAudioSetVolumn('/audio/move.mp3'),
      rotate: getAudioSetVolumn('/audio/rotate.mp3'),
      drop: getAudioSetVolumn('/audio/drop.mp3'),
      cleanLine: new Audio('/audio/clean.mp3'),
      over: new Audio('/audio/over.mp3'),
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
