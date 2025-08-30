# Atmosbyte installation on Raspberry Pi

This guide explains how to install and configure Atmosbyte to start automatically on boot on the Raspberry Pi Zero 2W.

## Requisites

- Raspberry Pi Zero 2W with Raspberry Pi OS
- SSH access or local terminal
- User with sudo privileges (not necessarily `pi`)

## Automatic installation

### 1. Build the ARM64 binary

On your development computer:

```bash
# Build the binary for Raspberry Pi
make build-rpi

# Or create a complete package for deployment
make package-rpi
```

### 2. Transfer files to the Raspberry Pi
Copy the following files to the Raspberry Pi:

```bash
# Using scp (replace PI_IP with your Raspberry Pi's IP and USERNAME with your user)
scp bin/linux-arm64/atmosbyte USERNAME@PI_IP:~/
scp atmosbyte.service USERNAME@PI_IP:~/
scp install-service.sh USERNAME@PI_IP:~/
scp install-service-current-user.sh USERNAME@PI_IP:~/
scp atmosbyte.yaml.example USERNAME@PI_IP:~/atmosbyte.yaml
```

Or if you created the package:

```bash
scp dist/atmosbyte-rpi-*.tar.gz USERNAME@PI_IP:~/
```

### 3. Install on the Raspberry Pi
On the Raspberry Pi:

```bash
# If using the tar.gz package
tar -xzf atmosbyte-rpi-*.tar.gz

# Edit the configuration as needed
nano atmosbyte.yaml

# Install the service
sudo ./install-service.sh
```
#### Configuration

Edit `atmosbyte.yaml` as needed:

```yaml
# Example of basic configuration
sensor:
  type: "hardware"  # or "simulated" for testing
  
web:
  port: 8080
  
database:
  path: "/opt/atmosbyte/data.db"
  
openweather:
  api_key: "your_api_key_here"
  station_id: "your_station_id"
```

**Installation details:**

- **Dedicated user:** Creates a specific user atmosbyte to run the service (more secure)
**Note:** The script automatically detects if the atmosbyte service is already running and stops it before proceeding with the installation.

## Useful Commands

### Manage the service

```bash
# Check status
sudo systemctl status atmosbyte

# View logs in real time
sudo journalctl -u atmosbyte -f

# Restart service
sudo systemctl restart atmosbyte

# Stop service
sudo systemctl stop atmosbyte

# Disable auto-start
sudo systemctl disable atmosbyte
```

### Logs and diagnostics

```bash
# View logs from the last 24 hours
sudo journalctl -u atmosbyte --since "24 hours ago"

# View logs in more detail
sudo journalctl -u atmosbyte -l --no-pager

# Check if the service is enabled at boot
sudo systemctl is-enabled atmosbyte
```

### Update application

```bash
# Stop service
sudo systemctl stop atmosbyte

# Replace binary
sudo cp new_atmosbyte /opt/atmosbyte/atmosbyte

# Start service
sudo systemctl start atmosbyte
```
**Note:** If you're using the installtion script you don't need to follow the steps above

## Troubleshooting

### Service does not start

1. Check logs: `sudo journalctl -u atmosbyte -l`
2. Check permissions: `ls -la /opt/atmosbyte/`
3. Test binary manually: `cd /opt/atmosbyte && ./atmosbyte`

### Problems with BME280 sensor
1. Check if I2C is enabled: sudo raspi-config
2. Check I2C devices: sudo i2cdetect -y 1
3. Check GPIO permissions: groups USERNAME (should include gpio)
    - If using dedicated user: groups atmosbyte

### Permission problems

```bash
# Fix permissions
sudo chown -R atmosbyte:atmosbyte /opt/atmosbyte
sudo chmod +x /opt/atmosbyte/atmosbyte

# If using dedicated user
sudo chown -R atmosbyte:atmosbyte /opt/atmosbyte
```

### Uninstall

```bash
# Using the Makefile (in the project directory)
make uninstall-service

# Or manually
sudo systemctl stop atmosbyte
sudo systemctl disable atmosbyte
sudo rm /etc/systemd/system/atmosbyte.service
sudo systemctl daemon-reload
sudo rm -rf /opt/atmosbyte
```

## Monitoring

The service will be automatically:
- Started on boot
- Restarted in case of failure (maximum 3 attempts in 60 seconds)
- Logged in the systemd journal
For continuous monitoring, you can use:

```bash
# Create a useful alias
echo 'alias atmosbyte-status="sudo systemctl status atmosbyte"' >> ~/.bashrc
echo 'alias atmosbyte-logs="sudo journalctl -u atmosbyte -f"' >> ~/.bashrc
```
