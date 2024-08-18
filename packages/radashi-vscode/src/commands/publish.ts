async function publishToNPM(radashiFolder: RadashiFolder) {
  const result = await execIntoOutputChannel(
    'pnpm',
    ['radashi', 'shipit', '--dry-run'],
    {
      cwd: radashiFolder.path,
    },
  )

  if (result.exitCode === 0) {
    vscode.window.showInformationMessage('Successfully published to NPM!')
  } else {
    vscode.window.showErrorMessage('Failed to publish to NPM')
  }
}
