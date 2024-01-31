import { useActor } from '@xstate/react'
import { useHotkeys } from 'react-hotkeys-hook'
import { tetrisMachine } from './tetrisMachine'
import './App.css'
import { useTapLongKey } from './useTapLongKey'

const EmptyBlock = () => (
  <div
    style={{
      width: '20px',
      height: '20px',
      backgroundColor: '#ccc',
      border: '1px solid white',
    }}
  />
)

const Block = () => (
  <div
    style={{
      width: '20px',
      height: '20px',
      backgroundColor: 'black',
      border: '1px solid white',
    }}
  />
)

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
 *  地圖邊緣能旋轉
 *  顯示預計落下的位置
 *  畫面重新設計
 *  顯示之後的方塊
 *  消除方塊動畫
 *  Tetris動畫
 *  T轉Bonus
 *
 */

function App() {
  const [state, send] = useActor(tetrisMachine)

  useTapLongKey('ArrowRight', () => send({ type: 'MOVE_RIGHT' }))
  useTapLongKey('ArrowLeft', () => send({ type: 'MOVE_LEFT' }))

  useHotkeys('s', () => send({ type: 'GAME_START' }))
  useHotkeys('ArrowDown', (e) => !e.repeat && send({ type: 'SPEEDUP_DOWN' }), {
    keydown: true,
  })
  useHotkeys('ArrowDown', () => send({ type: 'SLOWUP_DOWN' }), { keyup: true })
  useHotkeys('Z', () => send({ type: 'ROTATE' }))
  useHotkeys('space', () => send({ type: 'DROP_DOWN' }))
  useHotkeys('R', () => send({ type: 'RESTART_GAME' }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {state.matches('New Game') && <div>New Game</div>}
      {state.matches('Game Over') && <div>Game Over</div>}

      <div>{state.context.place.score}</div>
      <div>
        {state.context.place.place.map((x, xIndex) => (
          <div key={xIndex} style={{ display: 'flex' }}>
            {x.map((y, yIndex) =>
              y !== 0 ? <Block key={yIndex} /> : <EmptyBlock key={yIndex} />,
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default App
