const hanziNum = [
  '零',
  '壹',
  '贰',
  '叁',
  '肆',
  '伍',
  '陆',
  '柒',
  '捌',
  '玖'
]

/**
 * 数字转为大写汉字数字
 * @param num
 */
export function numToHanzi(num: number) {
  return num
    .toString()
    .split('')
    .map(n => hanziNum[Number(n)])
    .join('')
}
