module.exports = {
  apps: [
    {
      name: "alkotab-api",
      cwd: "/var/www/alkotab/api",
      script: "src/server.js",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 5001,
        PUPPETEER_EXECUTABLE_PATH:
          process.env.PUPPETEER_EXECUTABLE_PATH ||
          "/usr/bin/google-chrome-stable",
        WHATSAPP_AUTH_PATH:
          process.env.WHATSAPP_AUTH_PATH || "/var/www/alkotab/.wwebjs_auth",
      },
      error_file: "/var/log/pm2/alkotab-api-error.log",
      out_file: "/var/log/pm2/alkotab-api-out.log",
      time: true,
    },
    {
      name: "alkotab-web",
      cwd: "/var/www/alkotab/web",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3001",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 3001,
      },
      error_file: "/var/log/pm2/alkotab-web-error.log",
      out_file: "/var/log/pm2/alkotab-web-out.log",
      time: true,
    },
  ],
};
