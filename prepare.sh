#!/usr/bin/env bash

npm -v
npm install
npm run build
npx playwright install
sudo npx playwright install-deps
