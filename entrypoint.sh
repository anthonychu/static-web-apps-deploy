#!/bin/sh -l

# Build Next.js
cd /nextjs2swa
npm install
node index.js

cd /bin/staticsites/
./StaticSitesClient $INPUT_ACTION