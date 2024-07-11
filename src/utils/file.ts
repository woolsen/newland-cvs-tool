
/**
 * Open file in explorer
 * @param path
 */
export async function openFile(path: string) {
  await window.ipcRenderer.invoke('open-file', path)
}

/**
 * Check file exists
 * @param path
 */
export async function checkFileExists(path: string): Promise<boolean> {
  return window.ipcRenderer.invoke('check-file-exists', path)
}

/**
 * Rename file
 * @param oldPath
 * @param newPath
 */
export async function renameFile(oldPath: string, newPath: string) {
  await window.ipcRenderer.invoke('rename-file', oldPath, newPath)
}

/**
 * Delete file
 * @param path
 */
export async function deleteFile(path: string) {
  await window.ipcRenderer.invoke('delete-file', path)
}