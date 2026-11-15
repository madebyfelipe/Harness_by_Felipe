const { contextBridge, ipcRenderer } = require("electron");

/*
 * Ponte mínima entre a página da Central e o app desktop.
 * Só três coisas: escolher pasta no diálogo do sistema, criar pasta e abrir no
 * gerenciador de arquivos. Nada de acesso ao Node na página.
 */
contextBridge.exposeInMainWorld("centralDesktop", {
  plataforma: process.platform,
  versao: process.env.CENTRAL_DESKTOP_VERSION || "",
  escolherPasta: (opcoes) => ipcRenderer.invoke("central:escolher-pasta", opcoes),
  criarPasta: (pai, nome) => ipcRenderer.invoke("central:criar-pasta", { pai, nome }),
  abrirPasta: (caminho) => ipcRenderer.invoke("central:abrir-pasta", caminho),
  info: () => ipcRenderer.invoke("central:info")
});
