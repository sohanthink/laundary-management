// PM2 process file for the VPS: `pm2 start ecosystem.config.cjs`
module.exports = {
  apps: [
    {
      name: "an-nafi",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      max_memory_restart: "500M",
      env: { NODE_ENV: "production" },
    },
  ],
};
