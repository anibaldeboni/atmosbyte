#!/bin/bash
# Atmosbyte Installation Script for Raspberry Pi
# This script installs atmosbyte as a systemd service

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SERVICE_NAME="atmosbyte"
INSTALL_DIR="/opt/atmosbyte"
BINARY_NAME="atmosbyte"
CONFIG_FILE="atmosbyte.yaml"
SERVICE_FILE="atmosbyte.service"
SERVICE_USER="atmosbyte"
SERVICE_GROUP="atmosbyte"

# Print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        print_error "This script must be run as root (use sudo)"
        exit 1
    fi
}

# Check if atmosbyte service is running and stop it if necessary
check_and_stop_service() {
    print_status "Checking if $SERVICE_NAME service is already running"
    
    # Check if service exists and is active
    if systemctl is-active --quiet "$SERVICE_NAME" 2>/dev/null; then
        print_warning "Service $SERVICE_NAME is currently running"
        print_status "Stopping $SERVICE_NAME service before installation"
        
        if systemctl stop "$SERVICE_NAME"; then
            print_success "Service $SERVICE_NAME stopped successfully"
        else
            print_error "Failed to stop $SERVICE_NAME service"
            exit 1
        fi
    elif systemctl is-enabled --quiet "$SERVICE_NAME" 2>/dev/null; then
        print_status "Service $SERVICE_NAME exists but is not running"
        print_status "Disabling service before reinstallation"
        systemctl disable "$SERVICE_NAME" 2>/dev/null || true
    else
        print_success "No existing $SERVICE_NAME service found"
    fi
}

# Check if binary exists
check_binary() {
    local binary_path="./bin/linux-arm64/$BINARY_NAME"
    if [[ ! -f "$binary_path" ]]; then
        print_error "Binary not found at $binary_path"
        print_status "Please build the binary first with: make build-rpi"
        exit 1
    fi
    print_success "Binary found at $binary_path"
}

# Create service user if it doesn't exist
create_service_user() {
    if id "$SERVICE_USER" &>/dev/null; then
        print_success "User $SERVICE_USER already exists"
    else
        print_status "Creating service user $SERVICE_USER"
        
        # Create system user with no shell and no home directory login
        useradd --system --no-create-home --shell /bin/false --user-group "$SERVICE_USER"
        
        # Add to gpio group if it exists (for hardware sensor access)
        if getent group gpio &>/dev/null; then
            usermod -a -G gpio "$SERVICE_USER"
            print_status "Added $SERVICE_USER to gpio group for hardware sensor access"
        fi
        
        # Add to i2c group if it exists (for BME280 sensor)
        if getent group i2c &>/dev/null; then
            usermod -a -G i2c "$SERVICE_USER"
            print_status "Added $SERVICE_USER to i2c group for BME280 sensor access"
        fi
        
        print_success "Service user $SERVICE_USER created"
    fi
}

# Check if config file exists
check_config() {
    if [[ ! -f "$CONFIG_FILE" ]] && [[ ! -f "${CONFIG_FILE}.example" ]]; then
        print_error "Configuration file not found"
        print_status "Please create $CONFIG_FILE or copy from ${CONFIG_FILE}.example"
        exit 1
    fi
    
    if [[ ! -f "$CONFIG_FILE" ]] && [[ -f "${CONFIG_FILE}.example" ]]; then
        print_warning "Using example config file. Please review and customize it."
        cp "${CONFIG_FILE}.example" "$CONFIG_FILE"
    fi
    
    print_success "Configuration file found"
}

# Create installation directory
create_install_dir() {
    print_status "Creating installation directory at $INSTALL_DIR"
    mkdir -p "$INSTALL_DIR"
    chown "$SERVICE_USER:$SERVICE_GROUP" "$INSTALL_DIR"
    print_success "Installation directory created"
}

# Install binary and configuration
install_files() {
    print_status "Installing binary and configuration files"
    
    # Copy binary
    cp "./bin/linux-arm64/$BINARY_NAME" "$INSTALL_DIR/"
    chmod +x "$INSTALL_DIR/$BINARY_NAME"
    chown "$SERVICE_USER:$SERVICE_GROUP" "$INSTALL_DIR/$BINARY_NAME"
    
    # Copy configuration
    cp "$CONFIG_FILE" "$INSTALL_DIR/"
    chown "$SERVICE_USER:$SERVICE_GROUP" "$INSTALL_DIR/$CONFIG_FILE"
    
    print_success "Files installed successfully"
}

# Install systemd service
install_service() {
    print_status "Installing systemd service"
    
    if [[ ! -f "$SERVICE_FILE" ]]; then
        print_error "Service file $SERVICE_FILE not found"
        exit 1
    fi
    
    # Copy service file
    cp "$SERVICE_FILE" "/etc/systemd/system/"
    
    # Reload systemd
    systemctl daemon-reload
    
    print_success "Systemd service installed"
}

# Enable and start service
enable_service() {
    print_status "Enabling and starting $SERVICE_NAME service"
    
    # Enable service to start on boot
    systemctl enable "$SERVICE_NAME"
    
    # Start service
    systemctl start "$SERVICE_NAME"
    
    print_success "Service enabled and started"
}

# Check service status
check_service_status() {
    print_status "Checking service status"
    
    if systemctl is-active --quiet "$SERVICE_NAME"; then
        print_success "Service is running"
        print_status "Service status:"
        systemctl status "$SERVICE_NAME" --no-pager -l
    else
        print_warning "Service is not running"
        print_status "Checking logs for errors:"
        journalctl -u "$SERVICE_NAME" --no-pager -l -n 20
    fi
}

# Main installation function
main() {
    print_status "Starting Atmosbyte installation for Raspberry Pi"
    
    check_root
    check_and_stop_service
    check_binary
    check_config
    create_service_user
    create_install_dir
    install_files
    install_service
    enable_service
    
    print_success "Installation completed successfully!"
    print_status "The atmosbyte service will now start automatically on boot"
    print_status ""
    print_status "Service runs as user: $SERVICE_USER"
    print_status "Installation directory: $INSTALL_DIR"
    print_status ""
    print_status "Useful commands:"
    echo "  - Check status: sudo systemctl status $SERVICE_NAME"
    echo "  - View logs: sudo journalctl -u $SERVICE_NAME -f"
    echo "  - Restart service: sudo systemctl restart $SERVICE_NAME"
    echo "  - Stop service: sudo systemctl stop $SERVICE_NAME"
    echo "  - Disable auto-start: sudo systemctl disable $SERVICE_NAME"
    
    check_service_status
}

# Run main function
main "$@"
