module.exports = {
    apps: [
        {
            name: 'genoun-api',
            cwd: '/var/www/genoun-main/api',
            script: 'src/server.js',
            instances: 2,
            exec_mode: 'cluster',
            env: {
                NODE_ENV: 'production',
                PORT: 5000,
                PUPPETEER_EXECUTABLE_PATH: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/google-chrome-stable',
                WHATSAPP_AUTH_PATH: process.env.WHATSAPP_AUTH_PATH || '/var/www/genoun-main/.wwebjs_auth'
            },
            error_file: '/var/log/pm2/genoun-api-error.log',
            out_file: '/var/log/pm2/genoun-api-out.log',
            time: true
        },
        {
            name: 'genoun-web',
            cwd: '/var/www/genoun-main/web',
            script: 'node_modules/next/dist/bin/next',
            args: 'start -p 3000',
            instances: 1,
            env: {
                NODE_ENV: 'production',
                PORT: 3000
            },
            error_file: '/var/log/pm2/genoun-web-error.log',
            out_file: '/var/log/pm2/genoun-web-out.log',
            time: true
        }
    ]
};
