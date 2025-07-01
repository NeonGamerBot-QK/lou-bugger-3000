import { app,BrowserWindow } from "electron";
    let window;

function createWindow() {
    if(window) return;
    window = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    });
    window.loadFile("src/index.html");
}

app.on("ready", () => {
createWindow()
})

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
})
