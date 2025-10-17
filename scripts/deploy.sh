#!/bin/bash

# High Risk Client Review Workflow - Deployment Script
# This script handles the complete deployment process to AWS ECS

set -e

# Configuration
ENVIRONMENT=${ENVIRONMENT:-production}
AWS_REGION=${AWS_REGION:-us-east-1}
AWS_ACCOUNT_ID=${AWS_ACCOUNT_ID}
CLUSTER_NAME="${ENVIRONMENT}-hrcrw-cluster"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check required environment variables
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    if [ -z "$AWS_ACCOUNT_ID" ]; then
        log_error "AWS_ACCOUNT_ID environment variable is required"
        exit 1
    fi
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI is not installed"
        exit 1
    fi
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi
    
    # Check if logged into AWS
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "Not authenticated with AWS. Please run 'aws configure' or set AWS credentials"
        exit 1
    fi
    
    log_info "Prerequisites check passed"
}

# Create ECR repositories if they don't exist
create_ecr_repositories() {
    log_info "Creating ECR repositories..."
    
    # Backend repository
    aws ecr describe-repositories --repository-names hrcrw-backend --region $AWS_REGION 2>/dev/null || \
    aws ecr create-repository --repository-name hrcrw-backend --region $AWS_REGION
    
    # Frontend repository
    aws ecr describe-repositories --repository-names hrcrw-frontend --region $AWS_REGION 2>/dev/null || \
    aws ecr create-repository --repository-name hrcrw-frontend --region $AWS_REGION
    
    log_info "ECR repositories ready"
}

# Build and push Docker images
build_and_push_images() {
    log_info "Building and pushing Docker images..."
    
    # Get ECR login token
    aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com
    
    # Build and push backend image
    log_info "Building backend image..."
    docker build -t hrcrw-backend:latest -f backend/Dockerfile --target production backend/
    docker tag hrcrw-backend:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/hrcrw-backend:latest
    docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/hrcrw-backend:latest
    
    # Build and push frontend image
    log_info "Building frontend image..."
    docker build -t hrcrw-frontend:latest -f frontend/Dockerfile --target production frontend/
    docker tag hrcrw-frontend:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/hrcrw-frontend:latest
    docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/hrcrw-frontend:latest
    
    log_info "Images pushed successfully"
}

# Update task definitions with current account ID and region
update_task_definitions() {
    log_info "Updating task definitions..."
    
    # Update backend task definition
    sed "s/ACCOUNT_ID/$AWS_ACCOUNT_ID/g; s/REGION/$AWS_REGION/g" aws/ecs-task-definition-backend.json > /tmp/backend-task-def.json
    
    # Update frontend task definition
    sed "s/ACCOUNT_ID/$AWS_ACCOUNT_ID/g; s/REGION/$AWS_REGION/g" aws/ecs-task-definition-frontend.json > /tmp/frontend-task-def.json
    
    log_info "Task definitions updated"
}

# Register task definitions
register_task_definitions() {
    log_info "Registering task definitions..."
    
    # Register backend task definition
    aws ecs register-task-definition --cli-input-json file:///tmp/backend-task-def.json --region $AWS_REGION
    
    # Register frontend task definition
    aws ecs register-task-definition --cli-input-json file:///tmp/frontend-task-def.json --region $AWS_REGION
    
    log_info "Task definitions registered"
}

# Update ECS services
update_services() {
    log_info "Updating ECS services..."
    
    # Update backend service
    aws ecs update-service \
        --cluster $CLUSTER_NAME \
        --service hrcrw-backend-service \
        --task-definition hrcrw-backend \
        --region $AWS_REGION
    
    # Update frontend service
    aws ecs update-service \
        --cluster $CLUSTER_NAME \
        --service hrcrw-frontend-service \
        --task-definition hrcrw-frontend \
        --region $AWS_REGION
    
    log_info "Services updated"
}

# Wait for deployment to complete
wait_for_deployment() {
    log_info "Waiting for deployment to complete..."
    
    # Wait for backend service
    log_info "Waiting for backend service deployment..."
    aws ecs wait services-stable \
        --cluster $CLUSTER_NAME \
        --services hrcrw-backend-service \
        --region $AWS_REGION
    
    # Wait for frontend service
    log_info "Waiting for frontend service deployment..."
    aws ecs wait services-stable \
        --cluster $CLUSTER_NAME \
        --services hrcrw-frontend-service \
        --region $AWS_REGION
    
    log_info "Deployment completed successfully"
}

# Run database migrations
run_migrations() {
    log_info "Running database migrations..."
    
    # Get a running backend task
    TASK_ARN=$(aws ecs list-tasks \
        --cluster $CLUSTER_NAME \
        --service-name hrcrw-backend-service \
        --desired-status RUNNING \
        --region $AWS_REGION \
        --query 'taskArns[0]' \
        --output text)
    
    if [ "$TASK_ARN" != "None" ] && [ -n "$TASK_ARN" ]; then
        log_info "Running migrations on task: $TASK_ARN"
        aws ecs execute-command \
            --cluster $CLUSTER_NAME \
            --task $TASK_ARN \
            --container hrcrw-backend \
            --interactive \
            --command "alembic upgrade head" \
            --region $AWS_REGION
    else
        log_warn "No running backend tasks found. Please run migrations manually."
    fi
}

# Health check
health_check() {
    log_info "Performing health check..."
    
    # Get ALB DNS name (this would need to be retrieved from CloudFormation outputs or AWS CLI)
    # For now, we'll just check if services are running
    
    BACKEND_RUNNING=$(aws ecs describe-services \
        --cluster $CLUSTER_NAME \
        --services hrcrw-backend-service \
        --region $AWS_REGION \
        --query 'services[0].runningCount' \
        --output text)
    
    FRONTEND_RUNNING=$(aws ecs describe-services \
        --cluster $CLUSTER_NAME \
        --services hrcrw-frontend-service \
        --region $AWS_REGION \
        --query 'services[0].runningCount' \
        --output text)
    
    if [ "$BACKEND_RUNNING" -gt 0 ] && [ "$FRONTEND_RUNNING" -gt 0 ]; then
        log_info "Health check passed - services are running"
    else
        log_error "Health check failed - some services are not running"
        exit 1
    fi
}

# Main deployment function
main() {
    log_info "Starting deployment for environment: $ENVIRONMENT"
    
    check_prerequisites
    create_ecr_repositories
    build_and_push_images
    update_task_definitions
    register_task_definitions
    update_services
    wait_for_deployment
    run_migrations
    health_check
    
    log_info "Deployment completed successfully!"
}

# Parse command line arguments
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "build")
        check_prerequisites
        create_ecr_repositories
        build_and_push_images
        ;;
    "update")
        check_prerequisites
        update_task_definitions
        register_task_definitions
        update_services
        wait_for_deployment
        ;;
    "migrate")
        run_migrations
        ;;
    "health")
        health_check
        ;;
    *)
        echo "Usage: $0 {deploy|build|update|migrate|health}"
        echo "  deploy  - Full deployment (default)"
        echo "  build   - Build and push images only"
        echo "  update  - Update services only"
        echo "  migrate - Run database migrations"
        echo "  health  - Perform health check"
        exit 1
        ;;
esac