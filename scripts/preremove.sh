#!/bin/sh
set -e

# Stop and disable the service before removal
systemctl stop atmosbyte.service || true
systemctl disable atmosbyte.service || true
