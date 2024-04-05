const http = require("node:http");

const users = {
    'John': '123',
    'Jane': '456'
}

const server = http.createServer(function (req, res) {
    if (req.url.startsWith('/auth')) {
        const queryParams = new URLSearchParams(req.url.split('?')[1])
        const cookie = users[queryParams.get('user')]
        res.writeHead(200, {
            "Content-Type": "application/json",
            "Set-Cookie": `cookie=${cookie}; Max-Age=2592000`
        });
        res.end();
    } else if (req.url === '/test') {
        console.log(req.headers.cookie)
        setTimeout(function () {
            res.writeHead(200, { "Content-Type": "application/json" });
            if ('cookie' in req.headers && req.headers.cookie.includes('=')) {
                const cookie = req.headers.cookie.split('=')[1]
                for (const entry of Object.entries(users)) {
                    if (entry[1] === cookie) {
                        res.end(JSON.stringify({ success: true, username: entry[0] }));
                        return
                    }
                }
            }
            res.end(JSON.stringify({ success: false }));
        }, 0)
    } else if (req.url === '/create_article' || req.url === '/create_video') {
        let payload = ''
        req.on('data', function (chunk) {
            payload += chunk
        })
        req.on('end', function () {
            console.log(req.url, payload)
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: true }));
        })
    } else {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: false, msg: "Unknown URL" }));
    }
})

server.listen(8000)