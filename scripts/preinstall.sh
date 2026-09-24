#!/bin/sh
set -e

# Create user if it doesn't exist
if ! id "atmosbyte" >/dev/null 2>&1; then
    useradd --system --no-create-home --shell /bin/false --user-group atmosbyte
fi

# Add to gpio group if it exists (for hardware sensor access)
if getent group gpio >/dev/null 2>&1; then
    usermod -a -G gpio atmosbyte
fi

# Add to i2c group if it exists (for BME280 sensor)
if getent group i2c >/dev/null 2>&1; then
    usermod -a -G i2c atmosbyte
fi
