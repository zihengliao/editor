const { Menu } = require("electron");

function setupAppMenu(app) {
  const isMac = process.platform === "darwin";

  const template = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: "about" },
              { type: "separator" },
              { role: "services" },
              { type: "separator" },
              { role: "hide" },
              { role: "hideOthers" },
              { role: "unhide" },
              { type: "separator" },
              { role: "quit" },
            ],
          },
        ]
      : []),
    {
      label: "File",
      submenu: [
        {
          label: "Open Video...",
          accelerator: "CmdOrCtrl+O",
          click: () => {
            // Placeholder only. Functionality will be wired later.
          },
        },
        {
          label: "Open Recent",
          enabled: false,
          submenu: [{ label: "No recent files", enabled: false }],
        },
        { type: "separator" },
        ...(isMac
          ? [
              {
                label: "Quit",
                accelerator: "Cmd+Q",
                click: () => {
                  // Placeholder only. Functionality will be wired later.
                },
              },
            ]
          : [
              {
                label: "Exit",
                accelerator: "Alt+F4",
                click: () => {
                  // Placeholder only. Functionality will be wired later.
                },
              },
            ]),
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

module.exports = {
  setupAppMenu,
};
