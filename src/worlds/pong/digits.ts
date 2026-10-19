/** Classic 3×5 pixel digits, one string of 15 cells (row by row, '#' = on) per digit. */
const FONT = [
  '###' + '#.#' + '#.#' + '#.#' + '###', // 0
  '.#.' + '##.' + '.#.' + '.#.' + '###', // 1
  '###' + '..#' + '###' + '#..' + '###', // 2
  '###' + '..#' + '###' + '..#' + '###', // 3
  '#.#' + '#.#' + '###' + '..#' + '..#', // 4
  '###' + '#..' + '###' + '..#' + '###', // 5
  '###' + '#..' + '###' + '#.#' + '###', // 6
  '###' + '..#' + '..#' + '..#' + '..#', // 7
  '###' + '#.#' + '###' + '#.#' + '###', // 8
  '###' + '#.#' + '###' + '..#' + '###', // 9
]

export const DIGIT_COLS = 3
export const DIGIT_ROWS = 5
export const DIGIT_CELLS = DIGIT_COLS * DIGIT_ROWS

/** Whether cell `i` (row-major, top row first) of `digit` is lit. Digits above 9 show as 9. */
export const digitCell = (digit: number, i: number) =>
  FONT[Math.max(0, Math.min(9, digit))][i] === '#'
