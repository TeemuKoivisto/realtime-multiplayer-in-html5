import { Pos } from '../types/game'

export function toFixed(x: number, n?: number): number {
  n = n || 3
  return Number.parseFloat(x.toFixed())
}

//copies a 2d vector like object from one to another
export function pos(a: Pos) {
  return { x: a.x, y: a.y }
}

//Add a 2d vector with another one and return the resulting vector
export function v_add(a: Pos, b: Pos) {
  return { x: toFixed(a.x + b.x), y: toFixed(a.y + b.y) }
}

//Subtract a 2d vector with another one and return the resulting vector
export function v_sub(a: Pos, b: Pos) {
  return { x: toFixed(a.x - b.x), y: toFixed(a.y - b.y) }
}

//Multiply a 2d vector with a scalar value and return the resulting vector
export function v_mul_scalar(a: Pos, b: number) {
  return { x: toFixed(a.x * b), y: toFixed(a.y * b) }
}

//Simple linear interpolation
export function lerp(p: number, n: number, t: number) {
  let _t = Number(t)
  _t = toFixed(Math.max(0, Math.min(1, _t)))
  return toFixed(p + _t * (n - p))
}

//Simple linear interpolation between 2 vectors
export function v_lerp(v: Pos, tv: Pos, t: number) {
  return { x: lerp(v.x, tv.x, t), y: lerp(v.y, tv.y, t) }
}
