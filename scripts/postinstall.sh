#!/bin/sh
set -e

# Ensure permissions are correct
chown -R atmosbyte:atmosbyte /opt/atmosbyte

# Reload systemd
systemctl daemon-reload

# Enable and start the service
systemctl enable atmosbyte.service
systemctl start atmosbyte.service || true
