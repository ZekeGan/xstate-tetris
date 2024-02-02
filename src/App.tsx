import { useActor } from '@xstate/react'
import { useHotkeys } from 'react-hotkeys-hook'
import { tetrisMachine } from './tetrisMachine'
import { useTapLongKey } from './useTapLongKey'
import { animationDuration, pieceCode } from './config'
import './App.css'
import { useEffect } from 'react'

/**
 *  // 左右
 *  // 下
 *  // 方塊之間的碰撞
 *  // 地圖邊緣旋轉限制
 *  // 方塊間碰撞
 *  // 紀錄活動方塊位置
 *  // 保存成固定方塊位置
 *  // 顯示下個活動方塊
 *  // 每回合計算是否有連成線的方塊，相連分數高
 *  // 消除相連方塊
 *  // 快速落下
 *  // 左右馬上反應 #應該在持續按下後觸發快速左右功能
 *  // 頂點偵測遊戲結束
 *  // 重新開始遊戲
 *  // 地圖邊緣能旋轉 #計算旋轉後超過邊界的長度，移動piece的位置
 *  // T轉Bonus
 *  // 畫面重新設計
 *  // 消除方塊動畫
 *  顯示預計落下的位置
 *  顯示之後的方塊
 *  Tetris動畫
 *
 *  FIX: T旋轉後再hard drop依然是T spin
 *
 */

const getPieceColor = (code: number) => {
  let color: string

  switch (code) {
    case 11:
    case 21:
      color = '#87CBDC' // blue
      break

    case 12:
    case 22:
      color = '#EC5E59' // red
      break

    case 13:
    case 23:
      color = '#F9DD4B' // yellow
      break

    case 14:
    case 24:
      color = '#7FBB41' // green
      break

    case 15:
    case 25:
      color = '#EC6D37' // orange
      break

    case 16:
    case 26:
      color = '#EF96E4' // pink
      break

    case 17:
    case 27:
      color = '#AB88F6'
      break

    default:
      color = '#fff'
  }

  return color
}
const getIsBorder = (place: number[][], xIndex: number, yIndex: number) => ({
  top: (() => (!place[yIndex - 1] ? true : !place[yIndex - 1][xIndex]))(),
  bottom: (() => (!place[yIndex + 1] ? true : !place[yIndex + 1][xIndex]))(),
  left: (() => !place[yIndex][xIndex - 1])(),
  right: (() => !place[yIndex][xIndex + 1])(),
})

const EmptyBlock = () => (
  <div
    style={{
      width: '30px',
      height: '30px',
      backgroundColor: '#FDF2E9', // plain1
    }}
  />
)

type BorderWidth = { top: boolean; bottom: boolean; left: boolean; right: boolean }
const Block = ({ code, border }: { code: number; border: BorderWidth }) => (
  <div
    style={{
      width: '30px',
      height: '30px',
      backgroundColor: getPieceColor(code),
      borderStyle: 'solid',
      borderLeftWidth: border.left ? '4px' : '0px',
      borderRightWidth: border.right ? '4px' : '0px',
      borderTopWidth: border.top ? '4px' : '0px',
      borderBottomWidth: border.bottom ? '4px' : '0px',
    }}
  />
)

const CleanLineAnimationBlock = () => {
  return (
    <div className='place_animation_container'>
      <div className='place_animation_block2' />
      <div className='place_animation_block1' />
    </div>
  )
}

const DisplayNextPiece = () => {
  const [state, send] = useActor(tetrisMachine)
  const { matrix, pieceType } = state.context.currentPiece

  return (
    <div className='display_piece'>
      <div>
        {matrix.map((y, yIndex) => (
          <div key={yIndex} className='place_yAxis'>
            {y.map((x, xIndex) => {
              const code = x !== 0 ? pieceCode.static[pieceType] : 0
              const border: BorderWidth = getIsBorder(matrix, xIndex, yIndex)
              return code !== 0 ? (
                <Block key={xIndex} code={code} border={border} />
              ) : (
                <EmptyBlock key={xIndex} />
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

const NewGame = () => {
  return (
    <div className='place_popup_block'>
      <div>← →</div>
      <div>Move</div>
      <br />
      <div>↓</div>
      <div>Soft Drop</div>
      <br />
      <div>Z</div>
      <div>Rotate</div>
      <br />
      <div>Space</div>
      <div>Hard Drop</div>
      <br />
      <div>Press S to Start the Game</div>
    </div>
  )
}

const GameOver = () => {
  return (
    <div className='place_popup_block'>
      <div>GAME OVER</div>
      <br />
      <div>Press R to Restart the Game</div>
    </div>
  )
}

function App() {
  const [state, send] = useActor(tetrisMachine)
  const { popupText, place } = state.context
  const score = `${'0'.repeat(12 - place.score.toString().length)}${place.score}`

  // assign CSS variable
  useEffect(() => {
    document.documentElement.style.setProperty(
      '--animationDuration',
      `${animationDuration.toString()}ms`,
    )
  }, [])

  useTapLongKey('ArrowRight', () => send({ type: 'MOVE_RIGHT' }))
  useTapLongKey('ArrowLeft', () => send({ type: 'MOVE_LEFT' }))
  useHotkeys('ArrowDown', () => send({ type: 'SLOWUP_DOWN' }), { keyup: true })
  useHotkeys('ArrowDown', (e) => !e.repeat && send({ type: 'SPEEDUP_DOWN' }), {
    keydown: true,
  })

  useHotkeys('space', () => send({ type: 'DROP_DOWN' }))
  useHotkeys('s', () => send({ type: 'GAME_START' }))
  useHotkeys('Z', () => send({ type: 'ROTATE' }))
  useHotkeys('R', () => send({ type: 'RESTART_GAME' }))

  return (
    <div className='main_container'>
      {/* Place */}
      <div className='place_container'>
        <div className='place'>
          {place.place.map((y, yIndex) => (
            <div key={yIndex} className='place_yAxis'>
              {place.lineIndexes.includes(yIndex) && <CleanLineAnimationBlock />}
              {y.map((x, xIndex) => {
                const border = getIsBorder(place.place, xIndex, yIndex)
                return x !== 0 ? (
                  <Block key={xIndex} code={x} border={border} />
                ) : (
                  <EmptyBlock key={xIndex} />
                )
              })}
            </div>
          ))}
        </div>
        <div className='place_popup'>
          {state.matches('New Game') && <NewGame />}
          {state.matches('Game Over') && <GameOver />}
          {popupText && <div>{popupText}</div>}
        </div>
      </div>

      {/* Display */}
      <div className='display_container'>
        <DisplayNextPiece />
        <div className='display_score'>{score}</div>
      </div>
    </div>
  )
}

export default App
