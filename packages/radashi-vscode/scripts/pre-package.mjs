import glob from 'fast-glob'
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'


// Copy README.md to dist folder
fs.copyFileSync('README.md', 'dist/README.md')

// Copy LICENSE.md to dist folder
fs.copyFileSync('../../LICENSE.md', 'dist/LICENSE.md')

// Copy assets to dist folder
for (const file of glob.sync('assets/**/*', {
  ignore: ['**/node_modules/**'],
})) {
  const destPath = path.resolve('dist', file)
  fs.mkdirSync(path.dirname(destPath), { recursive: true })
  fs.copyFileSync(file, destPath)
}

const helperDir = path.resolve('../radashi-helper')
const helperPackageJson = JSON.parse(
  fs.readFileSync(path.join(helperDir, 'package.json'), 'utf8'),
)

// Read the package.json file
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'))
packageJson.main = './extension.cjs'

// Remove unnecessary fields
const fieldsToRemove = ['type', 'devDependencies', 'scripts']
fieldsToRemove.forEach(field => {
  delete packageJson[field]
})

// Write the modified package.json to the dist folder
fs.writeFileSync('dist/package.json', JSON.stringify(packageJson, null, 2))

// Run npm install in the dist folder
execSync('npm install --ignore-scripts', {
  cwd: 'dist',
  stdio: 'inherit',
})
