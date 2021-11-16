// server.js
const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')

const dev = false
const app = next({ dev })
const handle = app.getRequestHandler()

async function main() {
    await app.prepare()
    const port = parseInt(process.env.FUNCTIONS_CUSTOMHANDLER_PORT, 10) || parseInt(process.env.PORT, 10) || 3000
    createServer((req, res) => {
        let parsedUrl = parse(req.url, true)
        if (parsedUrl.pathname.startsWith('/api/server_function') && req.headers["x-ms-original-url"]) {
            parsedUrl = parse(req.headers["x-ms-original-url"], true)
            req.url = parsedUrl.pathname + (parsedUrl.search || "")
        }
        res.setHeader('x-ms-nextjs-render', 'server')

        // HACK: To get around custom handler bug that doesn't return redirects
        // Use JavaScript to redirect to the correct URL
        // https://github.com/Azure/azure-functions-host/issues/7860
        const origWriteHead = res.writeHead
        res.writeHead = function (statusCode) {
            if ([301, 302, 303, 307].includes(statusCode)) {
                origWriteHead.apply(res, [200])
                res.end(`
                    <script>
                        window.history.replaceState(null, null, "${res.getHeader('location')}")
                        window.location.reload()
                    </script>
                `)
            } else {
                origWriteHead.apply(res, arguments)
            }
        }

        const origSetHeader = res.setHeader
        res.setHeader = function () {
            if (arguments[0].toLowerCase() === 'set-cookie') {
                if (Array.isArray(arguments[1])) {
                    arguments[1] = arguments[1].map(v => v.replace("Expires=Thu, 01 Jan 1970 00:00:00 GMT", "Expires=Thu, 01 Jan 1970 00:00:01 GMT"))
                } else if (typeof value === 'string') {
                    arguments[1] = arguments[1].replace("Expires=Thu, 01 Jan 1970 00:00:00 GMT", "Expires=Thu, 01 Jan 1970 00:00:01 GMT")
                }
            }
            origSetHeader.apply(res, arguments)
            origSetHeader.apply(res, [arguments[0] + '1', arguments[1]])
        }

        handle(req, res, parsedUrl)
    }).listen(port, (err) => {
        if (err) throw err
        console.log(`> Ready on http://localhost:${port}`)
    })
}

main()