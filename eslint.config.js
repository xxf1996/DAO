import { snowdream } from '@snowdream_x/eslint-config'

export default snowdream({
  typescript: true
}, [
  {
    ignores: ['src/styles/**/*.css'],
  } // 自定义规则，可以进行覆盖
])
