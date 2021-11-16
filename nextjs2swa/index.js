const fs = require('fs-extra')
const path = require('path')
const util = require('util')
const os = require('os')
const exec = util.promisify(require('child_process').exec)

// validate app location
let origAppDir = process.env.INPUT_APP_LOCATION
if (!origAppDir) {
    console.log(`App location is empty`)
    process.exit(1)
}
if (origAppDir === '/') {
    origAppDir = '.'
}
origAppDir = path.resolve(process.cwd(), origAppDir)
if (!fs.existsSync(origAppDir)) {
    console.log(`App location ${origAppDir} does not exist`)
    process.exit(1)
}

const outputDir = path.resolve(process.cwd(), '.nextjs2swa')
const apiDir = path.resolve(outputDir, 'api')
const staticDir = path.resolve(outputDir, 'static')

async function main() {
    const packageJson = require(path.resolve(origAppDir, 'package.json'))
    const hasNextJs = packageJson.dependencies && packageJson.dependencies.next
    
    if (hasNextJs) {
        console.log(`Next.js app detected. Building for Azure Static Web Apps...`)
    } else {
        console.log(`Not a Next.js app. Skipping Next.js build.`)
        process.exit(0)
    } 
    
    if (fs.existsSync(outputDir)) {
        console.log(`Removing existing output folder ${outputDir}`)
        fs.removeSync(outputDir)
    }
    
    console.log(`Creating output folder ${outputDir}`)
    fs.mkdirSync(outputDir)

    // copy to temp folder first in case apiDir is a child of origAppDir
    const tempDir = path.resolve(os.tmpdir(), 'nextjs2swa')
    fs.mkdirSync(tempDir)
    console.log(`Copying app into ${tempDir}`)
    fs.copySync(origAppDir, tempDir)
    console.log(`Copying app into ${apiDir}`)
    fs.copySync(tempDir, apiDir)

    console.log(`Building app in ${apiDir}`)
    const { stdout, stderr } = await exec(`npm i && npx next build`, {
        cwd: apiDir
    })

    // TODO: switch to spawn instead of exec
    console.log(stdout)
    console.error(stderr)

    const buildSucceeded = fs.existsSync(path.resolve(apiDir, '.next'))
    if (!buildSucceeded) {
        console.log(`Couldn't find ${path.resolve(apiDir, '.next')}. Exiting.`)
        process.exit(1)
    }

    if (fs.existsSync(path.resolve(apiDir, 'public'))) {
        console.log(`Copying public folder to ${staticDir}`)
        fs.copySync(path.resolve(apiDir, 'public'), path.resolve(staticDir))
    }

    console.log(`Copying ${path.resolve(apiDir, '.next', 'server', 'pages')} to ${staticDir}`)
    fs.copySync(path.resolve(apiDir, '.next', 'server', 'pages'), path.resolve(staticDir), {
        filter: (src, _) => {
            return fs.lstatSync(src).isDirectory() ||
                (/\.(html|json)$/.test(src) && 
                !src.endsWith('/404.html') &&
                !src.endsWith('/500.html') &&
                !src.endsWith('.js.nft.json'))
        }
    })

    console.log(`Copying ${path.resolve(apiDir, '.next', 'static')} to ${path.resolve(staticDir, '_next', 'static')}`)
    fs.copySync(path.resolve(apiDir, '.next/static'), path.resolve(staticDir, '_next', 'static'))

    console.log(`Updating build script in package.json`)
    packageJson.scripts.build = 'echo "skipping build"'
    fs.writeFileSync(path.resolve(apiDir, 'package.json'), JSON.stringify(packageJson, null, 2))

    let generatedIndexHtml = false
    if (!fs.existsSync(path.resolve(staticDir, 'index.html'))) {
        console.log(`Generating index.html in ${staticDir}`)
        // write a dummy /index.html file because Static Web Apps needs it
        fs.writeFileSync(path.resolve(staticDir, 'index.html'), '<html><body><h1>Azure Static Web Apps</h1></body></html>')
        generatedIndexHtml = true
    }

    console.log(`Generating staticwebapp.config.json`)
    const staticwebappConfig = {
        "navigationFallback": {
            "rewrite": "/api/server_function",
        },
    }
    if (generatedIndexHtml) {
        staticwebappConfig.routes = [
            {
                "route": "/index.html",
                "rewrite": "/api/server_function",
            },
            {
                "route": "/",
                "rewrite": "/api/server_function",
            },
        ]
    }
    fs.writeFileSync(path.resolve(staticDir, 'staticwebapp.config.json'), JSON.stringify(staticwebappConfig, null, 2))


    console.log(`Creating Azure Functions assets`)
    fs.copySync(path.resolve(__dirname, 'functions_files'), apiDir)

    console.log(`Creating script to update environment`)
    const commands =
        `export INPUT_APP_LOCATION=.nextjs2swa/static\n` +
        `export INPUT_API_LOCATION=.nextjs2swa/api\n` +
        `export INPUT_OUTPUT_LOCATION=\n` +
        `export INPUT_SKIP_APP_BUILD=true\n` +
        `export DISABLE_PHP_BUILD=true\n`
    fs.writeFileSync('/update_env', commands)
}

main()