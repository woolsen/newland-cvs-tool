import {app, BrowserWindow, ipcMain, shell} from 'electron'
import {createRequire} from 'node:module'
import {exec} from "child_process";
import {fileURLToPath} from 'node:url'
import path from 'node:path'
import os from 'node:os'
import iconv from 'iconv-lite'
import fs from "node:fs";


const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬ dist-electron
// │ ├─┬ main
// │ │ └── index.js    > Electron-Main
// │ └─┬ preload
// │   └── index.mjs   > Preload-Scripts
// ├─┬ dist
// │ └── index.html    > Electron-Renderer
//
process.env.APP_ROOT = path.join(__dirname, '../..')
process.env.PATH = `${process.env.PATH};${path.dirname('cvsnt/')}`;

export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')
export const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST

// Disable GPU Acceleration for Windows 7
if (os.release().startsWith('6.1')) app.disableHardwareAcceleration()

// Set application name for Windows 10+ notifications
if (process.platform === 'win32') app.setAppUserModelId(app.getName())

if (!app.requestSingleInstanceLock()) {
  app.quit()
  process.exit(0)
}

let win: BrowserWindow | null = null
const preload = path.join(__dirname, '../preload/index.mjs')
const indexHtml = path.join(RENDERER_DIST, 'index.html')

async function createWindow() {
  win = new BrowserWindow({
    title: 'CVS Tool by 翁凯强',
    icon: path.join(process.env.VITE_PUBLIC, 'newland.ico'),
    width: 1024,  // 窗口宽度
    height: 768,  // 窗口高度
    webPreferences: {
      preload,
      // Warning: Enable nodeIntegration and disable contextIsolation is not secure in production
      // nodeIntegration: true,

      // Consider using contextBridge.exposeInMainWorld
      // Read more on https://www.electronjs.org/docs/latest/tutorial/context-isolation
    },
    autoHideMenuBar: !VITE_DEV_SERVER_URL,
  })

  if (VITE_DEV_SERVER_URL) { // #298
    win.loadURL(VITE_DEV_SERVER_URL)
    // Open devTool if the app is not packaged
    win.webContents.openDevTools()
  } else {
    win.loadFile(indexHtml)
  }

  // Test actively push message to the Electron-Renderer
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', new Date().toLocaleString())
  })

  // Make all links open with the browser, not with the application
  win.webContents.setWindowOpenHandler(({url}) => {
    if (url.startsWith('https:')) shell.openExternal(url)
    return {action: 'deny'}
  })
  // win.webContents.on('will-navigate', (event, url) => { }) #344
}

app.commandLine.appendSwitch('lang', 'zh-CN');

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  win = null
  if (process.platform !== 'darwin') app.quit()
})

app.on('second-instance', () => {
  if (win) {
    // Focus on the main window if the user tried to open another
    if (win.isMinimized()) win.restore()
    win.focus()
  }
})

app.on('activate', () => {
  const allWindows = BrowserWindow.getAllWindows()
  if (allWindows.length) {
    allWindows[0].focus()
  } else {
    createWindow()
  }
})

// New window example arg: new windows url
ipcMain.handle('open-win', (_, arg) => {
  const childWindow = new BrowserWindow({
    webPreferences: {
      preload,
      nodeIntegration: true,
      contextIsolation: false,
    },
  })

  if (VITE_DEV_SERVER_URL) {
    childWindow.loadURL(`${VITE_DEV_SERVER_URL}#${arg}`)
  } else {
    childWindow.loadFile(indexHtml, {hash: arg})
  }
})

ipcMain.handle('open-file', async (event, path: string) => {
  await shell.openPath(path)
});

ipcMain.handle('check-file-exists', async (event, path: string) => {
  return fs.existsSync(path);
})

// 重命名文件
ipcMain.handle('rename-file', async (event, oldPath: string, newPath: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    fs.rename(oldPath, newPath, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
});

// 删除文件
ipcMain.handle('delete-file', async (event, path: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    fs.unlink(path, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
});

// 处理来自渲染进程的指令执行请求
ipcMain.handle('cmd', async (event, command: string, cwd: string) => {
  console.log('Execute command: ', command);
  return new Promise((resolve, reject) => {
    let realCommand = command;
    if (cwd) {
      realCommand = `cd ${cwd} && ${command}`;
    }
    cmd(realCommand, (error, stdout, stderr) => {
      if (stdout) {
        console.log(stdout);
      }
      if (stderr) {
        console.error(stderr);
      }
      if (error) {
        reject(stderr);
      } else {
        resolve(stdout);
      }
    });
  });
});


ipcMain.handle('open-folder', async (event, filePath) => {
  shell.showItemInFolder(filePath);
});

function cmd(command: string, callback: (error: Error | null, stdout: string, stderr: string) => void) {
  exec(command, {encoding: 'buffer'}, (error, stdout, stderr) => {
    const stdoutGbk = iconv.decode(stdout, 'gbk');
    const stderrGbk = iconv.decode(stderr, 'gbk');
    callback(error, stdoutGbk, stderrGbk);
  });
}
