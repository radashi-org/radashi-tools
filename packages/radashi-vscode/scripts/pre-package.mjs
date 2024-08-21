import glob from 'fast-glob'
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

// Read the package.json file
const packageJsonPath = path.resolve('package.json')
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
packageJson.main = './extension.cjs'

// Remove unnecessary fields
const fieldsToRemove = ['type', 'devDependencies', 'scripts']
fieldsToRemove.forEach(field => {
  delete packageJson[field]
})

// Write the modified package.json to the dist folder
const distPackageJsonPath = path.resolve('dist', 'package.json')
fs.writeFileSync(distPackageJsonPath, JSON.stringify(packageJson, null, 2))

// Copy README.md to dist folder
const readmePath = path.resolve('README.md')
const distReadmePath = path.resolve('dist', 'README.md')
fs.copyFileSync(readmePath, distReadmePath)

// Copy LICENSE.md to dist folder
const licensePath = path.resolve('../../LICENSE.md')
const distLicensePath = path.resolve('dist', 'LICENSE.md')
fs.copyFileSync(licensePath, distLicensePath)

// Add .vscodeignore
const ignored = ['node_modules']
fs.writeFileSync(path.resolve('dist', '.vscodeignore'), ignored.join('\n'))

// Copy assets to dist folder
const assetsGlob = './assets/**/*'
const assetFiles = glob.sync(assetsGlob, { dot: true })

for (const file of assetFiles) {
  const destPath = path.resolve('dist', file)
  fs.mkdirSync(path.dirname(destPath), { recursive: true })
  fs.copyFileSync(file, destPath)
}

// Run npm install in the dist folder
execSync('npm install', {
  cwd: path.resolve('dist'),
  stdio: 'inherit',
})
