-- Database initialization script for High Risk Client Review Workflow
-- This script sets up the initial database configuration

-- Create database if it doesn't exist (handled by Docker environment variables)
-- CREATE DATABASE IF NOT EXISTS hrcrw_dev;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create indexes for performance
-- These will be created by Alembic migrations, but we can prepare the database

-- Set timezone
SET timezone = 'UTC';

-- Create application user (optional, for additional security)
-- This is handled by the application connection string