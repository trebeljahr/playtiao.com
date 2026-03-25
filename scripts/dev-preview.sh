#!/bin/sh
# Delegates to dev.mjs which handles free port detection for both client and server.
exec node scripts/dev.mjs "$@"
