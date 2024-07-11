window.ipcRenderer.on('main-process-message', (_event, ...args) => {
  console.log('[Receive Main-process message]:', ...args)
})

/**
 * Execute command
 * @param command
 * @param cwd
 * @returns Promise of stdout
 */
export async function cmd(command: string, cwd: string | null = null): Promise<string> {
  return new Promise((resolve, reject) => {
    window.ipcRenderer.invoke('cmd', command, cwd).then(resolve).catch(reject)
  })
}

/**
 * Open file in explorer
 * @param path
 */
export async function openFile(path: string) {
  await window.ipcRenderer.invoke('open-file', path)
}