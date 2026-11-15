const { contextBridge, ipcRenderer } = require("electron");

/*
 * Ponte mínima entre a página da Central e o app desktop.
 * Modo local: escolher pasta no diálogo do sistema, criar pasta e abrir no
 * gerenciador de arquivos. Modo VPS: nada de pastas (os agentes rodam na VPS,
 * não neste computador), então a página se comporta como a web.
 * Nada de acesso ao Node na página.
 */
const modo = (process.argv.find((a) => a.startsWith("--central-modo=")) || "").split("=")[1] === "vps" ? "vps" : "local";

if (modo === "local") {
  contextBridge.exposeInMainWorld("centralDesktop", {
    plataforma: process.platform,
    versao: process.env.CENTRAL_DESKTOP_VERSION || "",
    modo,
    escolherPasta: (opcoes) => ipcRenderer.invoke("central:escolher-pasta", opcoes),
    criarPasta: (pai, nome) => ipcRenderer.invoke("central:criar-pasta", { pai, nome }),
    abrirPasta: (caminho) => ipcRenderer.invoke("central:abrir-pasta", caminho),
    info: () => ipcRenderer.invoke("central:info")
  });
}
