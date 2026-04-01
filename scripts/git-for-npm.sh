#!/usr/bin/env sh
# .npmrc sets git= to this script so lockfile git+ssh:// deps use HTTPS on CI without SSH keys.
exec git \
  -c "url.https://github.com/.insteadOf=git@github.com:" \
  -c "url.https://github.com/.insteadOf=ssh://git@github.com/" \
  "$@"
