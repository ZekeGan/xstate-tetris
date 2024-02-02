import { useEffect } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { useActor } from '@xstate/react'
import { tetrisMachine } from '@/tetrisMachine'
import { useTapLongKey } from '@/hooks/useTapLongKey'
import { animationDuration, pieceCode } from '@/config'
import { BorderWidth } from '@/type'
import { Piece, PieceMap } from '@/utils/Pieces'
import { getIsBorder } from '@/utils/getIsBorder'
import { getPieceColor } from './utils/getPieceColor'
import '@/style.css'

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
 *  // Tetris動畫
 *  // 顯示之後的方塊
 *  // 背景音樂
 *
 *
 *  // FIX: 更改分數計算方式
 *  // FIX: T旋轉後再hard drop依然是T spin
 *  // FIX: GAME OVER 觸發很奇怪
 */

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

const GameOver = () => {
  return (
    <div className='place_popup_block'>
      <div>GAME OVER</div>
      <br />
      <div>Press R to Restart the Game</div>
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

const GenerateDisplay = ({ piece }: { piece: Piece }) => (
  <div>
    {piece.matrix.map((y, yIndex) => (
      <div key={yIndex} className='place_yAxis'>
        {y.map((x, xIndex) => {
          const code = x !== 0 ? pieceCode.static[piece.pieceType] : 0
          const border: BorderWidth = getIsBorder(piece.matrix, xIndex, yIndex)
          return code !== 0 ? (
            <Block key={xIndex} code={code} border={border} />
          ) : (
            <div key={xIndex} className='empty_piece' />
          )
        })}
      </div>
    ))}
  </div>
)

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
              {/* animation */}
              {place.lineIndexes.includes(yIndex) && (
                <div className='place_animation_container'>
                  <div className='place_animation_block2' />
                  <div className='place_animation_block1' />
                </div>
              )}

              {/* piece */}
              {y.map((x, xIndex) => {
                const border = getIsBorder(place.place, xIndex, yIndex)
                return x !== 0 ? (
                  <Block key={xIndex} code={x} border={border} />
                ) : (
                  <div key={xIndex} className='empty_piece' />
                )
              })}
            </div>
          ))}
        </div>

        {/* popup */}
        <div className='place_popup'>
          {popupText && <div className='place_popup_text'>{popupText}</div>}
          {state.matches('New Game') && <NewGame />}
          {state.matches('Game Over') && <GameOver />}
        </div>
      </div>

      {/* Display */}
      <div className='display_container'>
        {/* next piece */}
        <div className='display_piece'>
          {state.matches('New Game') && (
            <GenerateDisplay piece={new PieceMap[98]() as Piece} />
          )}
          {state.matches('In Progress') && (
            <GenerateDisplay piece={state.context.pieceQueue[0]} />
          )}
          {state.matches('Game Over') && (
            <GenerateDisplay piece={new PieceMap[99]() as Piece} />
          )}
        </div>
        {/* score */}
        <div className='display_score'>{score}</div>
      </div>
    </div>
  )
}

export default App
