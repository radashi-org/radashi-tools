import fs from 'node:fs'

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))

export default {
  commit: 'chore(release): ' + pkg.name + '@%s',
  tag: pkg.name + '@%s',
}
