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