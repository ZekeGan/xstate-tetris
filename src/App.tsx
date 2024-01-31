import { useActor } from '@xstate/react'
import { isHotkeyPressed, useHotkeys } from 'react-hotkeys-hook'
import { tetrisMachine } from './tetrisMachine'
import './App.css'
import { useState } from 'react'
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
 * 1. 方塊邊緣碰撞
 *  //1-1. 左右
 *  //1-2. 下
 *  //1-3. 方塊之間的碰撞
 *  //1-4. 地圖邊緣旋轉限制
 * 2. 方塊生命週期
 *  //2-1. 方塊間碰撞
 *  //2-2. 紀錄活動方塊位置
 *  //2-3. 保存成固定方塊位置
 *  //2-4. 顯示下個活動方塊
 * 3. 分數計算
 *  //3-1. 每回合計算是否有連成線的方塊，相連分數高
 *  //3-2. 消除相連方塊
 * 4. 額外功能
 *  //4-1. 快速落下
 *  2. 頂點偵測遊戲結束
 *  左右馬上反應 #應該在持續按下後觸發快速左右功能
 *  3. 消除方塊動畫
 *  1. 顯示之後的方塊
 *  4-4. 顯示預計落下的位置
 *  4-5.
 *  4-6.
 *
 */

// var count = 0
// document.getElementById('GameCanvas').addEventListener('keydown', (e) => {
//   if (e.key === 'ArrowRight') {
//     count++
//     console.log(count)
//   }
// })

function App() {
  const [{ context }, send] = useActor(tetrisMachine)

  useTapLongKey('ArrowRight', () => send({ type: 'MOVE_RIGHT' }))
  useTapLongKey('ArrowLeft', () => send({ type: 'MOVE_LEFT' }))

  useHotkeys('s', () => send({ type: 'GAME_START' }))
  useHotkeys('ArrowDown', (e) => !e.repeat && send({ type: 'SPEEDUP_DOWN' }), {
    keydown: true,
  })
  useHotkeys('ArrowDown', () => send({ type: 'SLOWUP_DOWN' }), { keyup: true })
  useHotkeys('Z', () => send({ type: 'ROTATE' }))
  useHotkeys('space', () => send({ type: 'DROP_DOWN' }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>{context.place.score}</div>
      <div>
        {context.place.place.map((x, xIndex) => (
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
