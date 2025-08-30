# Atmosbyte - Weather Data Processing System
# Makefile for cross-platform builds

PROJECT_NAME := atmosbyte
BUILD_TIME := $(shell date -u '+%Y-%m-%d_%H:%M:%S')
COMMIT_HASH := $(shell git rev-parse --short HEAD 2>/dev/null || echo "unknown")

BUILD_DIR := bin
MAIN_FILE := .

LDFLAGS := -w -s

GOOS ?= $(shell go env GOOS)
GOARCH ?= $(shell go env GOARCH)

BINARY_NAME := $(PROJECT_NAME)
ifeq ($(GOOS),windows)
	BINARY_NAME := $(PROJECT_NAME).exe
endif

BINARY_PATH := $(BUILD_DIR)/$(GOOS)-$(GOARCH)/$(BINARY_NAME)

GREEN := \033[32m
YELLOW := \033[33m
CYAN := \033[36m
RESET := \033[0m

.DEFAULT_GOAL := help

.PHONY: help
help: ## Show this help message
	@echo "$(CYAN)Atmosbyte - Weather Data Processing System$(RESET)"
	@echo "$(YELLOW)Available targets:$(RESET)"
	@echo "  help               Show this help message"
	@echo "  clean              Remove build artifacts"
	@echo "  fmt                Format Go code"
	@echo "  test               Run tests"
	@echo "  build              Build binary for target platform"
	@echo "  build-rpi          Build for Raspberry Pi (ARM64)"
	@echo "  version            Show version information"
	@echo "  info               Show build information"
	@echo ""
	@echo "$(YELLOW)Raspberry Pi deployment:$(RESET)"
	@echo "  build-rpi          Build binary for Raspberry Pi"
	@echo "  package-rpi        Create deployment package"
	@echo "  install-service    Install systemd service (run on Pi)"
	@echo "  uninstall-service  Remove systemd service"
	@echo "  service-status     Check service status"
	@echo "  service-logs       View service logs"
	@echo ""
	@echo "$(YELLOW)Build examples:$(RESET)"
	@echo "  make build                    # Build for current platform"
	@echo "  make build GOOS=linux GOARCH=amd64  # Build for Linux AMD64"
	@echo "  make build GOOS=windows GOARCH=amd64 # Build for Windows AMD64"
	@echo "  make build GOOS=linux GOARCH=arm64  # Build for Linux ARM64 (Raspberry Pi 4)"
	@echo "  make build GOOS=linux GOARCH=arm    # Build for Linux ARM (Raspberry Pi 3)"

$(BUILD_DIR):
	@mkdir -p $(BUILD_DIR)

.PHONY: clean
clean: ## Remove build artifacts
	@echo "$(YELLOW)Cleaning build artifacts...$(RESET)"
	@rm -rf $(BUILD_DIR)
	@echo "$(GREEN)✓ Clean completed$(RESET)"

.PHONY: fmt
fmt: ## Format Go code
	@echo "$(YELLOW)Formatting Go code...$(RESET)"
	@go fmt ./...
	@echo "$(GREEN)✓ Code formatted$(RESET)"

.PHONY: test
test: ## Run tests
	@echo "$(YELLOW)Running tests...$(RESET)"
	@go test -v ./...
	@echo "$(GREEN)✓ Tests completed$(RESET)"

.PHONY: build
build: $(BUILD_DIR) fmt ## Build binary for target platform
	@echo "$(YELLOW)Building $(PROJECT_NAME) for $(GOOS)/$(GOARCH)...$(RESET)"
	@mkdir -p $(dir $(BINARY_PATH))
	@GOOS=$(GOOS) GOARCH=$(GOARCH) go build \
		-ldflags "$(LDFLAGS)" \
		-o $(BINARY_PATH) \
		$(MAIN_FILE)
	@echo "$(GREEN)✓ Build completed: $(BINARY_PATH)$(RESET)"
	@ls -lh $(BINARY_PATH)

.PHONY: info
info: ## Show build information
	@echo "$(CYAN)Build Information:$(RESET)"
	@echo "  Project:     $(PROJECT_NAME)"
	@echo "  Build Time:  $(BUILD_TIME)"
	@echo "  Commit:      $(COMMIT_HASH)"
	@echo "  Go Version:  $(shell go version)"
	@echo "  Target OS:   $(GOOS)"
	@echo "  Target Arch: $(GOARCH)"
	@echo "  Build Dir:   $(BUILD_DIR)"

.PHONY: build-rpi
build-rpi: fmt ## Build binary for Raspberry Pi (ARM64)
	@echo "$(YELLOW)Building $(PROJECT_NAME) for Raspberry Pi (linux/arm64)...$(RESET)"
	@mkdir -p $(BUILD_DIR)/linux-arm64
	@GOOS=linux GOARCH=arm64 go build \
		-ldflags "$(LDFLAGS)" \
		-o $(BUILD_DIR)/linux-arm64/$(PROJECT_NAME) \
		$(MAIN_FILE)
	@echo "$(GREEN)✓ Raspberry Pi binary built successfully$(RESET)"
	@echo "  Binary: $(BUILD_DIR)/linux-arm64/$(PROJECT_NAME)"
	@file $(BUILD_DIR)/linux-arm64/$(PROJECT_NAME)

.PHONY: install-service
install-service: build-rpi ## Build and install systemd service on Raspberry Pi
	@echo "$(YELLOW)Installing atmosbyte systemd service...$(RESET)"
	@chmod +x install-service.sh
	@if [ "$(shell uname -m)" = "aarch64" ]; then \
		echo "$(GREEN)Running on ARM64 system, installing service...$(RESET)"; \
		sudo ./install-service.sh; \
	else \
		echo "$(RED)This target should be run on the Raspberry Pi$(RESET)"; \
		echo "$(YELLOW)Copy the following files to your Raspberry Pi and run:$(RESET)"; \
		echo "  - $(BUILD_DIR)/linux-arm64/$(PROJECT_NAME)"; \
		echo "  - atmosbyte.service"; \
		echo "  - install-service.sh"; \
		echo "  - atmosbyte.yaml (or atmosbyte.yaml.example)"; \
		echo "$(YELLOW)Then run: sudo ./install-service.sh$(RESET)"; \
	fi

.PHONY: uninstall-service
uninstall-service: ## Uninstall systemd service
	@echo "$(YELLOW)Uninstalling atmosbyte service...$(RESET)"
	@sudo systemctl stop atmosbyte || true
	@sudo systemctl disable atmosbyte || true
	@sudo rm -f /etc/systemd/system/atmosbyte.service
	@sudo systemctl daemon-reload
	@sudo rm -rf /opt/atmosbyte
	@echo "$(GREEN)✓ Service uninstalled$(RESET)"

.PHONY: service-status
service-status: ## Check service status
	@echo "$(CYAN)Atmosbyte Service Status:$(RESET)"
	@sudo systemctl status atmosbyte --no-pager -l || true

.PHONY: service-logs
service-logs: ## View service logs
	@echo "$(CYAN)Atmosbyte Service Logs:$(RESET)"
	@sudo journalctl -u atmosbyte -f

.PHONY: package-rpi
package-rpi: build-rpi ## Create deployment package for Raspberry Pi
	@echo "$(YELLOW)Creating deployment package...$(RESET)"
	@mkdir -p dist
	@tar -czf dist/atmosbyte-rpi-$(BUILD_TIME).tar.gz \
		-C $(BUILD_DIR)/linux-arm64 $(PROJECT_NAME) \
		-C ../../ atmosbyte.service install-service.sh atmosbyte.yaml.example
	@echo "$(GREEN)✓ Deployment package created: dist/atmosbyte-rpi-$(BUILD_TIME).tar.gz$(RESET)"
