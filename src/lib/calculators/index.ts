/**
 * 计算器核心模块统一导出
 *
 * 所有计算逻辑均为纯函数，不依赖 React 或 UI 库，可独立测试。
 */

export type { BoostInputs, BoostResults, BoostWaveformPoint } from "./boost"
export { calculateBoost, generateBoostWaveforms } from "./boost"

export type { RippleInputs, RippleScalars, WaveformPoint, RippleResult } from "./boost-ripple"
export { calculateBoostRipple } from "./boost-ripple"

export type { LoopInputs, LoopScalars, BodePoint, LoopResult } from "./led-loop"
export { calculateLedLoop } from "./led-loop"
