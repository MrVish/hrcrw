# Makefile for High Risk Client Review Workflow Backend

# Variables
PYTHON := python3
VENV := venv
REQUIREMENTS := requirements.txt
ALEMBIC := alembic
DB_SCRIPTS := scripts

# Colors for output
GREEN := \033[0;32m
YELLOW := \033[1;33m
RED := \033[0;31m
NC := \033[0m # No Color

.PHONY: help install dev test clean migrate seed backup restore status

# Default target
help:
	@echo "$(GREEN)High Risk Client Review Workflow - Backend Management$(NC)"
	@echo ""
	@echo "Available targets:"
	@echo "  $(YELLOW)install$(NC)     - Install dependencies"
	@echo "  $(YELLOW)dev$(NC)         - Run development server"
	@echo "  $(YELLOW)test$(NC)        - Run tests"
	@echo "  $(YELLOW)clean$(NC)       - Clean up generated files"
	@echo ""
	@echo "Database Management:"
	@echo "  $(YELLOW)db-init$(NC)     - Initialize database (migrations + seeding)"
	@echo "  $(YELLOW)db-migrate$(NC)  - Run database migrations"
	@echo "  $(YELLOW)db-seed$(NC)     - Seed database with initial data"
	@echo "  $(YELLOW)db-reset$(NC)    - Reset database (WARNING: Deletes all data!)"
	@echo "  $(YELLOW)db-status$(NC)   - Show database status"
	@echo "  $(YELLOW)db-backup$(NC)   - Create database backup"
	@echo "  $(YELLOW)db-restore$(NC)  - Restore database from backup"
	@echo ""
	@echo "Migration Management:"
	@echo "  $(YELLOW)migration-create$(NC) - Create new migration (MESSAGE=description)"
	@echo "  $(YELLOW)migration-upgrade$(NC) - Upgrade to latest migration"
	@echo "  $(YELLOW)migration-downgrade$(NC) - Downgrade migration (STEPS=1)"
	@echo "  $(YELLOW)migration-history$(NC) - Show migration history"

# Installation
install:
	@echo "$(GREEN)Installing dependencies...$(NC)"
	$(PYTHON) -m pip install --upgrade pip
	$(PYTHON) -m pip install -r $(REQUIREMENTS)

# Development server
dev:
	@echo "$(GREEN)Starting development server...$(NC)"
	$(PYTHON) run.py

# Testing
test:
	@echo "$(GREEN)Running tests...$(NC)"
	$(PYTHON) -m pytest tests/ -v

test-coverage:
	@echo "$(GREEN)Running tests with coverage...$(NC)"
	$(PYTHON) -m pytest tests/ --cov=app --cov-report=html --cov-report=term

# Cleanup
clean:
	@echo "$(GREEN)Cleaning up...$(NC)"
	find . -type f -name "*.pyc" -delete
	find . -type d -name "__pycache__" -delete
	find . -type d -name "*.egg-info" -exec rm -rf {} +
	rm -rf .pytest_cache/
	rm -rf htmlcov/
	rm -rf .coverage

# Database Management
db-init:
	@echo "$(GREEN)Initializing database...$(NC)"
	$(PYTHON) $(DB_SCRIPTS)/setup_database.py init

db-init-force:
	@echo "$(YELLOW)Force initializing database (will delete existing data)...$(NC)"
	$(PYTHON) $(DB_SCRIPTS)/setup_database.py init --force

db-migrate:
	@echo "$(GREEN)Running database migrations...$(NC)"
	$(PYTHON) $(DB_SCRIPTS)/setup_database.py upgrade

db-seed:
	@echo "$(GREEN)Seeding database...$(NC)"
	$(PYTHON) $(DB_SCRIPTS)/seed_database.py

db-seed-clear:
	@echo "$(YELLOW)Clearing and seeding database...$(NC)"
	$(PYTHON) $(DB_SCRIPTS)/seed_database.py --clear

db-reset:
	@echo "$(RED)Resetting database (WARNING: This will delete all data!)$(NC)"
	$(PYTHON) $(DB_SCRIPTS)/setup_database.py reset

db-status:
	@echo "$(GREEN)Checking database status...$(NC)"
	$(PYTHON) $(DB_SCRIPTS)/setup_database.py status

db-wait:
	@echo "$(GREEN)Waiting for database to become available...$(NC)"
	$(PYTHON) $(DB_SCRIPTS)/setup_database.py wait

db-backup:
	@echo "$(GREEN)Creating database backup...$(NC)"
	$(PYTHON) $(DB_SCRIPTS)/setup_database.py backup

db-restore:
	@echo "$(GREEN)Restoring database from backup...$(NC)"
	@if [ -z "$(FILE)" ]; then \
		echo "$(RED)Error: Please specify backup file with FILE=path/to/backup.sql$(NC)"; \
		exit 1; \
	fi
	$(PYTHON) $(DB_SCRIPTS)/setup_database.py restore $(FILE)

# Migration Management
migration-create:
	@if [ -z "$(MESSAGE)" ]; then \
		echo "$(RED)Error: Please specify migration message with MESSAGE='description'$(NC)"; \
		exit 1; \
	fi
	@echo "$(GREEN)Creating new migration: $(MESSAGE)$(NC)"
	$(PYTHON) $(DB_SCRIPTS)/manage_migrations.py create "$(MESSAGE)"

migration-create-manual:
	@if [ -z "$(MESSAGE)" ]; then \
		echo "$(RED)Error: Please specify migration message with MESSAGE='description'$(NC)"; \
		exit 1; \
	fi
	@echo "$(GREEN)Creating manual migration: $(MESSAGE)$(NC)"
	$(PYTHON) $(DB_SCRIPTS)/manage_migrations.py create "$(MESSAGE)" --manual

migration-upgrade:
	@echo "$(GREEN)Upgrading to latest migration...$(NC)"
	$(PYTHON) $(DB_SCRIPTS)/manage_migrations.py upgrade

migration-downgrade:
	@if [ -z "$(STEPS)" ]; then \
		STEPS=1; \
	fi; \
	echo "$(YELLOW)Downgrading migration by $$STEPS step(s)...$(NC)"; \
	$(PYTHON) $(DB_SCRIPTS)/manage_migrations.py downgrade --steps $$STEPS

migration-downgrade-to:
	@if [ -z "$(REVISION)" ]; then \
		echo "$(RED)Error: Please specify revision with REVISION=revision_id$(NC)"; \
		exit 1; \
	fi
	@echo "$(YELLOW)Downgrading to revision: $(REVISION)$(NC)"
	$(PYTHON) $(DB_SCRIPTS)/manage_migrations.py downgrade --to $(REVISION)

migration-history:
	@echo "$(GREEN)Showing migration history...$(NC)"
	$(PYTHON) $(DB_SCRIPTS)/manage_migrations.py history

migration-status:
	@echo "$(GREEN)Showing migration status...$(NC)"
	$(PYTHON) $(DB_SCRIPTS)/manage_migrations.py status

# Docker support
docker-build:
	@echo "$(GREEN)Building Docker image...$(NC)"
	docker build -t hrcrw-backend .

docker-run:
	@echo "$(GREEN)Running Docker container...$(NC)"
	docker run -p 8000:8000 --env-file .env hrcrw-backend

docker-compose-up:
	@echo "$(GREEN)Starting services with Docker Compose...$(NC)"
	docker-compose up -d

docker-compose-down:
	@echo "$(GREEN)Stopping Docker Compose services...$(NC)"
	docker-compose down

docker-compose-logs:
	@echo "$(GREEN)Showing Docker Compose logs...$(NC)"
	docker-compose logs -f

# Linting and formatting
lint:
	@echo "$(GREEN)Running linting...$(NC)"
	$(PYTHON) -m flake8 app/ tests/
	$(PYTHON) -m black --check app/ tests/
	$(PYTHON) -m isort --check-only app/ tests/

format:
	@echo "$(GREEN)Formatting code...$(NC)"
	$(PYTHON) -m black app/ tests/
	$(PYTHON) -m isort app/ tests/

# Security checks
security:
	@echo "$(GREEN)Running security checks...$(NC)"
	$(PYTHON) -m bandit -r app/

# Complete setup for new environment
setup: install db-init
	@echo "$(GREEN)Setup completed! You can now run 'make dev' to start the server.$(NC)"

# Quick development setup
quick-setup: install db-wait db-init
	@echo "$(GREEN)Quick setup completed!$(NC)"