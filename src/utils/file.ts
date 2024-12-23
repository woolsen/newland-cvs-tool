import {shell} from "electron";

/**
 * Open file in explorer
 * @param path
 */
export async function openFile(path: string) {
  await window.ipcRenderer.invoke('open-file', path)
}

export function openFolder(filePath: string) {
  window.ipcRenderer.invoke('open-folder', filePath);
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

export function getDirectoryPath(filePath: string): string {
  // 将反斜杠替换为正斜杠，标准化路径分隔符
  const normalizedPath = filePath.replace(/\\/g, '/');
  const parts = normalizedPath.split('/');
  parts.pop(); // 移除文件名部分
  return parts.join('/');
}

export function getFilename(filePath: string): string {
  return filePath.split(/([\\/])/).pop() || ''
}
