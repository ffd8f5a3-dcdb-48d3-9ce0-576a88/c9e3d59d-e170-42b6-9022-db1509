#!/usr/bin/env bash

npm -v
npm install
npm run build
sudo npx playwright install chromium 
sudo npx playwright install-deps
npm run start