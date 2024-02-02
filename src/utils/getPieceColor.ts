export const getPieceColor = (code: number) => {
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
