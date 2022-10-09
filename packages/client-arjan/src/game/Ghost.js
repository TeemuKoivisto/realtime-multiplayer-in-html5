export function Ghost({ x = 0, y = 0, width = 16, height = 16 }) {
  const position = { x, y }

  function setPosition(x, y) {
    position.x = x
    position.y = y
  }

  function getPosition() {
    return Object.assign({}, position)
  }

  function getWidth() {
    return width
  }

  function getHeight() {
    return height
  }

  return Object.freeze({
    getPosition,
    getWidth,
    getHeight,
    setPosition,
  })
}
