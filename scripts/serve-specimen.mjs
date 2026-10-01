#!/usr/bin/env node
// design-dissect: serve one reference folder on localhost so specimen comments save to its
// feedback.json. If the always-on design-feedback service (feedback/install.sh) is already
// running and covers this folder, this just prints its URL.
//
//   node serve-specimen.mjs <outDir> [port]      → http://localhost:<port>/specimen.html
import { start } from '../feedback/server.mjs';

start({ root: process.argv[2] || '.', port: +(process.argv[3] || 4777) });
