// main.js
// 開発中のみホットリロードを有効にする (electron-reloader)
try {
    require('electron-reloader')(module, {
        debug: true,
        watchRenderer: true, // renderer 側のファイル変更も監視
    });
} catch (err) {
    console.log('electron-reloader のセットアップに失敗:', err);
}

const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            // セキュリティ上、本番では preload スクリプトなどの利用を検討してください
            nodeIntegration: true,
            contextIsolation: false,
        },
    });

    win.loadFile('index.html');
}

app.whenReady().then(() => {
    createWindow();

    // macOS 向け：ウィンドウがない場合に再生成
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

// Windows/Linux 向け：全ウィンドウが閉じたら終了
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
