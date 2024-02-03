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
  /** @xstate-layout N4IgpgJg5mDOIC5QBUwBcBOBLWA6AcmAO4AEA4gIYC2YAxGQIICyAogPoDKyDASsgNoAGALqJQABwD2sLGiySAdmJAAPRAEZ1ANgAcuLQFYtAJgMAaEAE9ExzfuO2D6gwGY3ggOwGALAF9fFqiYOLgAkgokAAoYklAYcLC0HJEsLAAiAKqRbGkA8gDq+EKiSCBSMnKKymoIOjrquF4uJgCcxt4tgoLe5lYa3lqNgkY6BsbNgi4tzf6B6Nh44VExcQlJADIFWTkFRSLK5bLySqU1usa4nuouXsYmOi7qxhbWCOoDQwYGHlotOh4dbwuPwBEBBBZhCLRWLxWCJZChADCAGligdpEcqqdEECPLhOupujpvOoHqTRi9EB51HiPOMWt5BFpvD0TMZZmD5iEltDVnDcIiABZgADGAGsSKFYCQGGgSAAhSRoNCSKi0NGlQ6VE6gM4uC50lrOAFAuq6SlvSYXIw-bzElx1UYeDng7lQlawvBC0USqUyuWK5Wq9XqEoSDHa6pU5m4bzGDyCHQOEk3AYW6Z6RzqP5AloJm4urmLd0whIC4XiyXS2UKpUqtX8YxhsoR45RhDTQSNQkM7x0p409QW-4tXB3bPvQQtZnjdmg13F5al-neyt+9ZYBR0DXhipt7FvGkuXCjHxPHSdAEAi2aQz4rTA5zxm6-EFzYKL3me8s+qskDdbiGzZavuuoaNoXZJoI4zXEYTh-DehKDMYXTNAY0wuK4zrzkWkJLnyXoUAANiKACuREUGgYAkBwIqSPE6r7JqrZYmBh5OPoLRGg8D4eAy0w3lMeJ2nGYxXJoOhaIWH54V+ZaIsRZEUVRNF0Qx-Chuie6saoGiYchWgeF4fbtEa8aCXmsbEqYKHUhJUk4TJPIemWhCkDwkikQoECMcBLE6rpbx2norjoYy+l5r8FpjMe+p3P8TR-Pq0kQs5y54G5JAeV5PkaX52kBTU7wxlo7yaHa5IeG40U-GOdJjCSDy2th76pSWBECoomCSERtA8Lk3DICwO4tgV7akrouBuI807GJJ1yTBaWh3g4EmCE8himDoKVuvh36Il1MS9UwuQAGrsOsLAAGICExu6YoVNhdAYJ4OB4DwuJMwLfEtK22KS613GMBjbY5bV7fJh09bQJ3nWwPChGQAASt35Q9410hcfadPSyZdDoS3fI0VVbX2AKlS1nJOe1+1Q71aT9dkeSFCNIE6UVn0NO83zQcZn1xhaPxdk4fY3D8Xwzjtn4uSuFa+tKuSkXKuQAGa1hgEBgBgvlaejB4oX2jQsst+ksnULg3p4L2mD8kW-F9c6tbtcmy7+fqK8rauKhrWtAbrkYHqSmG4E4kwGJMdq9hbfSHr8Y6mD4Z7jHGDlO9L6U-muCtKyQqvq5r2uNmjAdsTS7R1e4Ql8cMvSvE8nRDJMPyPD0OiJlLuCUDQucAG6+zwLBcLwyBsIwrCs-542lV2jJJt8DhTjS3jpl2thaEyibiyOLQdwwChYFQlHHLQDCIgip0MENbCIpdDB7MXoGBaSL0848pgWdbwKfevzKYZo-iggUJITW8BSgLn9o-DmeJX5PFrogAAtHiKcUwcbZjzA8KcHdMpdzABA9m4F6ghygtmR4AIDaIReh0akThXDuC8JTBcskZagPuiXQK+lcA9mBPUdCnMCYx0+rSYwnQBhGTGIZUGacmEZ1XPLf0tYgxUDwY9BAjJvCcOQRVXh61+F12GMeYRcZrhNQdHNDuaUOqyL-ABXBzExoHiNLSDo04+L6gdFVRCJhGh1G6K+Be7xzE03kopcilFqK0XorY1hkDwJfH0NcUwOYqpGWjnXeMo4vgoRQpoKqiYDCBIhvyTK2VvLKPGihUc05-huHCgyd+McWQXAcCIwytwJEFJdl6OmZTA6R2Ju4MkTgfjDneFNeM2YiQm3aB05hmc5Ee1zl7eiBcelsRQiDEObQBiGXDm0Bk0VLLMjGLcSSU4GG4Rwb3LWqyn7ElHC3Za7RlroS4sOGeG8zlt2gtoHeYMQh7wPkfHSbMVGaCnGOJkkldBThZJhG8XwGjAlKiYKc9Q2j5IAUAA */
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
