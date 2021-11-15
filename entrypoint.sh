#!/bin/sh -l

# Build Next.js
export ORIG_WORKING_DIR=${PWD}
cd /nextjs2swa
npm install
cd ${ORIG_WORKING_DIR}
node /nextjs2swa/index.js

cd /bin/staticsites/
./StaticSitesClient $INPUT_ACTION