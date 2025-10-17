# High Risk Client Review Workflow - Deployment Guide

This document provides comprehensive instructions for deploying the High Risk Client Review Workflow application to AWS ECS using Docker containers.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Local Development Setup](#local-development-setup)
- [Docker Configuration](#docker-configuration)
- [AWS Infrastructure Setup](#aws-infrastructure-setup)
- [Database Setup](#database-setup)
- [Deployment Process](#deployment-process)
- [Monitoring and Health Checks](#monitoring-and-health-checks)
- [Troubleshooting](#troubleshooting)
- [Security Considerations](#security-considerations)

## Prerequisites

### Required Tools

- **Docker** (v20.10+) and Docker Compose (v2.0+)
- **AWS CLI** (v2.0+) configured with appropriate credentials
- **Node.js** (v18+) for frontend development
- **Python** (v3.11+) for backend development
- **PostgreSQL** (v15+) for database
- **Git** for version control

### AWS Requirements

- AWS Account with appropriate permissions
- ECS Cluster
- RDS PostgreSQL instance
- S3 bucket for document storage
- SES configured for email notifications
- Application Load Balancer
- VPC with public and private subnets

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Database Configuration
DATABASE_URL=postgresql://username:password@host:5432/database
REDIS_URL=redis://host:6379

# Application Configuration
SECRET_KEY=your-secret-key-change-in-production
DEBUG=false
ENVIRONMENT=production

# AWS Configuration
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-s3-bucket
SES_FROM_EMAIL=noreply@yourcompany.com

# Security Configuration
CORS_ORIGINS=https://yourdomain.com
ALLOWED_HOSTS=yourdomain.com
```

## Local Development Setup

### Using Docker Compose

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd high-risk-client-review-workflow
   ```

2. **Start services:**
   ```bash
   docker-compose up -d
   ```

3. **Initialize database:**
   ```bash
   cd backend
   make db-init
   ```

4. **Access the application:**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

### Manual Setup

1. **Backend setup:**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   make db-init
   python run.py
   ```

2. **Frontend setup:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## Docker Configuration

### Multi-Stage Builds

The application uses multi-stage Docker builds for optimization:

- **Development stage**: Includes development tools and hot reloading
- **Production stage**: Optimized for size and security

### Container Security

- Runs as non-root user
- Minimal base images
- Security headers configured
- Health checks implemented

### Build Commands

```bash
# Build backend image
docker build -t hrcrw-backend:latest -f backend/Dockerfile --target production backend/

# Build frontend image
docker build -t hrcrw-frontend:latest -f frontend/Dockerfile --target production frontend/
```

## AWS Infrastructure Setup

### 1. Create Infrastructure with CloudFormation

```bash
aws cloudformation create-stack \
  --stack-name hrcrw-infrastructure \
  --template-body file://aws/cloudformation-infrastructure.yaml \
  --parameters ParameterKey=Environment,ParameterValue=production \
               ParameterKey=CertificateArn,ParameterValue=arn:aws:acm:region:account:certificate/cert-id \
  --capabilities CAPABILITY_IAM
```

### 2. Create ECR Repositories

```bash
aws ecr create-repository --repository-name hrcrw-backend --region us-east-1
aws ecr create-repository --repository-name hrcrw-frontend --region us-east-1
```

### 3. Configure Secrets Manager

Store sensitive configuration in AWS Secrets Manager:

```bash
aws secretsmanager create-secret \
  --name hrcrw/database-url \
  --secret-string "postgresql://username:password@host:5432/database"

aws secretsmanager create-secret \
  --name hrcrw/secret-key \
  --secret-string "your-secret-key"
```

### 4. Create ECS Task Definitions

Update the task definition files with your account ID and region, then register:

```bash
# Update task definitions
sed -i 's/ACCOUNT_ID/123456789012/g' aws/ecs-task-definition-*.json
sed -i 's/REGION/us-east-1/g' aws/ecs-task-definition-*.json

# Register task definitions
aws ecs register-task-definition --cli-input-json file://aws/ecs-task-definition-backend.json
aws ecs register-task-definition --cli-input-json file://aws/ecs-task-definition-frontend.json
```

### 5. Create ECS Services

```bash
aws ecs create-service --cli-input-json file://aws/ecs-service-backend.json
aws ecs create-service --cli-input-json file://aws/ecs-service-frontend.json
```

## Database Setup

### Migration Management

The application uses Alembic for database migrations:

```bash
cd backend

# Check migration status
make migration-status

# Create new migration
make migration-create MESSAGE="Add new feature"

# Run migrations
make db-migrate

# Rollback migration
make migration-downgrade STEPS=1
```

### Database Seeding

```bash
# Seed with initial data
make db-seed

# Clear and re-seed
make db-seed-clear

# Reset database (WARNING: Deletes all data)
make db-reset
```

### Backup and Restore

```bash
# Create backup
make db-backup

# Restore from backup
make db-restore FILE=backup.sql
```

## Deployment Process

### Automated Deployment

Use the deployment scripts for automated deployment:

**Linux/macOS:**
```bash
# Set environment variables
export AWS_ACCOUNT_ID=123456789012
export AWS_REGION=us-east-1

# Full deployment
./scripts/deploy.sh

# Build and push images only
./scripts/deploy.sh build

# Update services only
./scripts/deploy.sh update
```

**Windows:**
```powershell
# Set environment variables
$env:AWS_ACCOUNT_ID = "123456789012"
$env:AWS_REGION = "us-east-1"

# Full deployment
.\scripts\deploy.ps1

# Build and push images only
.\scripts\deploy.ps1 build
```

### Manual Deployment Steps

1. **Build and push Docker images:**
   ```bash
   # Login to ECR
   aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 123456789012.dkr.ecr.us-east-1.amazonaws.com

   # Build and push backend
   docker build -t hrcrw-backend:latest -f backend/Dockerfile --target production backend/
   docker tag hrcrw-backend:latest 123456789012.dkr.ecr.us-east-1.amazonaws.com/hrcrw-backend:latest
   docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/hrcrw-backend:latest

   # Build and push frontend
   docker build -t hrcrw-frontend:latest -f frontend/Dockerfile --target production frontend/
   docker tag hrcrw-frontend:latest 123456789012.dkr.ecr.us-east-1.amazonaws.com/hrcrw-frontend:latest
   docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/hrcrw-frontend:latest
   ```

2. **Update ECS services:**
   ```bash
   aws ecs update-service --cluster hrcrw-cluster --service hrcrw-backend-service --task-definition hrcrw-backend
   aws ecs update-service --cluster hrcrw-cluster --service hrcrw-frontend-service --task-definition hrcrw-frontend
   ```

3. **Wait for deployment:**
   ```bash
   aws ecs wait services-stable --cluster hrcrw-cluster --services hrcrw-backend-service hrcrw-frontend-service
   ```

4. **Run database migrations:**
   ```bash
   # Get running task ARN
   TASK_ARN=$(aws ecs list-tasks --cluster hrcrw-cluster --service-name hrcrw-backend-service --query 'taskArns[0]' --output text)

   # Run migrations
   aws ecs execute-command --cluster hrcrw-cluster --task $TASK_ARN --container hrcrw-backend --interactive --command "alembic upgrade head"
   ```

## Monitoring and Health Checks

### Health Endpoints

- **Backend**: `GET /health`
- **Frontend**: `GET /health`

### ECS Health Checks

Containers include health checks that:
- Check application responsiveness
- Verify database connectivity
- Validate external service availability

### CloudWatch Monitoring

Monitor the following metrics:
- CPU and memory utilization
- Request count and latency
- Error rates
- Database connections

### Logging

Logs are sent to CloudWatch Logs:
- Application logs: `/ecs/hrcrw-backend` and `/ecs/hrcrw-frontend`
- Access logs: ALB access logs in S3

## Troubleshooting

### Common Issues

1. **Container fails to start:**
   ```bash
   # Check ECS service events
   aws ecs describe-services --cluster hrcrw-cluster --services hrcrw-backend-service

   # Check CloudWatch logs
   aws logs tail /ecs/hrcrw-backend --follow
   ```

2. **Database connection issues:**
   ```bash
   # Test database connectivity
   cd backend
   python scripts/setup_database.py wait --timeout 30
   ```

3. **Image build failures:**
   ```bash
   # Check Docker build logs
   docker build -t test-image -f backend/Dockerfile backend/ --no-cache
   ```

### Rollback Procedure

1. **Rollback to previous task definition:**
   ```bash
   # List task definition revisions
   aws ecs list-task-definitions --family-prefix hrcrw-backend

   # Update service to previous revision
   aws ecs update-service --cluster hrcrw-cluster --service hrcrw-backend-service --task-definition hrcrw-backend:1
   ```

2. **Rollback database migrations:**
   ```bash
   cd backend
   make migration-downgrade STEPS=1
   ```

### Testing Deployment

Run deployment tests:

```bash
# Run all deployment tests
python scripts/test_deployment.py

# Run specific test category
python scripts/test_deployment.py --category docker

# Generate test report
python scripts/test_deployment.py --report deployment-test-report.txt
```

## Security Considerations

### Network Security

- VPC with private subnets for application containers
- Security groups with minimal required access
- ALB with SSL/TLS termination
- WAF protection (recommended)

### Application Security

- Non-root container users
- Secrets stored in AWS Secrets Manager
- Environment-specific configuration
- Security headers in nginx

### Data Security

- Encryption at rest (RDS, S3)
- Encryption in transit (HTTPS, TLS)
- Pre-signed URLs for document access
- Audit logging for all operations

### Access Control

- IAM roles with least privilege
- ECS task roles for service-to-service communication
- API authentication with JWT tokens
- Role-based access control in application

## Maintenance

### Regular Tasks

1. **Update dependencies:**
   ```bash
   # Backend
   cd backend
   pip-audit
   pip install --upgrade -r requirements.txt

   # Frontend
   cd frontend
   npm audit
   npm update
   ```

2. **Rotate secrets:**
   ```bash
   # Update secrets in AWS Secrets Manager
   aws secretsmanager update-secret --secret-id hrcrw/secret-key --secret-string "new-secret-key"
   
   # Restart services to pick up new secrets
   aws ecs update-service --cluster hrcrw-cluster --service hrcrw-backend-service --force-new-deployment
   ```

3. **Database maintenance:**
   ```bash
   # Create database backup
   make db-backup

   # Analyze database performance
   # (Connect to RDS and run ANALYZE, VACUUM, etc.)
   ```

### Scaling

- **Horizontal scaling**: Increase ECS service desired count
- **Vertical scaling**: Update task definition with more CPU/memory
- **Database scaling**: Use RDS read replicas for read-heavy workloads
- **Auto-scaling**: Configure ECS auto-scaling based on CPU/memory metrics

## Support

For deployment issues:

1. Check CloudWatch logs for error messages
2. Verify all environment variables are set correctly
3. Ensure AWS permissions are properly configured
4. Run deployment tests to identify configuration issues
5. Check the troubleshooting section above

For application issues, refer to the main README.md file.