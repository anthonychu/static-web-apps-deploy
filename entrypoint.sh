#!/bin/sh -l

# Build Next.js
export ORIG_WORKING_DIR=${PWD}
cd /nextjs2swa
npm install
cd ${ORIG_WORKING_DIR}
node /nextjs2swa/index.js

if [ -f "/update_env" ]; then
    echo "Updating environment variables..."
    . /update_env
    rm /update_env
fi

cd /bin/staticsites/
./StaticSitesClient $INPUT_ACTION