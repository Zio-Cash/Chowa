#!/bin/bash
export PATH="/Users/giuliavalente/.nvm/versions/node/v24.16.0/bin:$PATH"
cd "$(dirname "$0")"
exec npm run dev
