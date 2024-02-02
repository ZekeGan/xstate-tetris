import { BorderWidth } from '@/type'

export const getIsBorder = (
  place: number[][],
  xIndex: number,
  yIndex: number,
): BorderWidth => ({
  top: (() => (!place[yIndex - 1] ? true : !place[yIndex - 1][xIndex]))(),
  bottom: (() => (!place[yIndex + 1] ? true : !place[yIndex + 1][xIndex]))(),
  left: (() => !place[yIndex][xIndex - 1])(),
  right: (() => !place[yIndex][xIndex + 1])(),
})
