# High Risk Client Review Workflow - PowerShell Deployment Script
# This script handles the complete deployment process to AWS ECS

param(
    [Parameter(Position=0)]
    [ValidateSet("deploy", "build", "update", "migrate", "health")]
    [string]$Action = "deploy",
    
    [string]$Environment = "production",
    [string]$AwsRegion = "us-east-1",
    [string]$AwsAccountId = $env:AWS_ACCOUNT_ID
)

# Configuration
$ClusterName = "$Environment-hrcrw-cluster"

# Colors for output
$Colors = @{
    Red = "Red"
    Green = "Green"
    Yellow = "Yellow"
}

# Logging functions
function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor $Colors.Green
}

function Write-Warn {
    param([string]$Message)
    Write-Host "[WARN] $Message" -ForegroundColor $Colors.Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor $Colors.Red
}

# Check required environment variables and tools
function Test-Prerequisites {
    Write-Info "Checking prerequisites..."
    
    if (-not $AwsAccountId) {
        Write-Error "AWS_ACCOUNT_ID environment variable is required"
        exit 1
    }
    
    # Check AWS CLI
    if (-not (Get-Command aws -ErrorAction SilentlyContinue)) {
        Write-Error "AWS CLI is not installed"
        exit 1
    }
    
    # Check Docker
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        Write-Error "Docker is not installed"
        exit 1
    }
    
    # Check if logged into AWS
    try {
        aws sts get-caller-identity | Out-Null
    }
    catch {
        Write-Error "Not authenticated with AWS. Please run 'aws configure' or set AWS credentials"
        exit 1
    }
    
    Write-Info "Prerequisites check passed"
}

# Create ECR repositories if they don't exist
function New-EcrRepositories {
    Write-Info "Creating ECR repositories..."
    
    # Backend repository
    try {
        aws ecr describe-repositories --repository-names hrcrw-backend --region $AwsRegion | Out-Null
    }
    catch {
        aws ecr create-repository --repository-name hrcrw-backend --region $AwsRegion | Out-Null
    }
    
    # Frontend repository
    try {
        aws ecr describe-repositories --repository-names hrcrw-frontend --region $AwsRegion | Out-Null
    }
    catch {
        aws ecr create-repository --repository-name hrcrw-frontend --region $AwsRegion | Out-Null
    }
    
    Write-Info "ECR repositories ready"
}

# Build and push Docker images
function Build-AndPushImages {
    Write-Info "Building and pushing Docker images..."
    
    # Get ECR login token
    $LoginCommand = aws ecr get-login-password --region $AwsRegion
    $LoginCommand | docker login --username AWS --password-stdin "$AwsAccountId.dkr.ecr.$AwsRegion.amazonaws.com"
    
    # Build and push backend image
    Write-Info "Building backend image..."
    docker build -t hrcrw-backend:latest -f backend/Dockerfile --target production backend/
    docker tag hrcrw-backend:latest "$AwsAccountId.dkr.ecr.$AwsRegion.amazonaws.com/hrcrw-backend:latest"
    docker push "$AwsAccountId.dkr.ecr.$AwsRegion.amazonaws.com/hrcrw-backend:latest"
    
    # Build and push frontend image
    Write-Info "Building frontend image..."
    docker build -t hrcrw-frontend:latest -f frontend/Dockerfile --target production frontend/
    docker tag hrcrw-frontend:latest "$AwsAccountId.dkr.ecr.$AwsRegion.amazonaws.com/hrcrw-frontend:latest"
    docker push "$AwsAccountId.dkr.ecr.$AwsRegion.amazonaws.com/hrcrw-frontend:latest"
    
    Write-Info "Images pushed successfully"
}

# Update task definitions with current account ID and region
function Update-TaskDefinitions {
    Write-Info "Updating task definitions..."
    
    # Update backend task definition
    $BackendTaskDef = Get-Content "aws/ecs-task-definition-backend.json" -Raw
    $BackendTaskDef = $BackendTaskDef -replace "ACCOUNT_ID", $AwsAccountId -replace "REGION", $AwsRegion
    $BackendTaskDef | Out-File -FilePath "$env:TEMP/backend-task-def.json" -Encoding UTF8
    
    # Update frontend task definition
    $FrontendTaskDef = Get-Content "aws/ecs-task-definition-frontend.json" -Raw
    $FrontendTaskDef = $FrontendTaskDef -replace "ACCOUNT_ID", $AwsAccountId -replace "REGION", $AwsRegion
    $FrontendTaskDef | Out-File -FilePath "$env:TEMP/frontend-task-def.json" -Encoding UTF8
    
    Write-Info "Task definitions updated"
}

# Register task definitions
function Register-TaskDefinitions {
    Write-Info "Registering task definitions..."
    
    # Register backend task definition
    aws ecs register-task-definition --cli-input-json "file://$env:TEMP/backend-task-def.json" --region $AwsRegion
    
    # Register frontend task definition
    aws ecs register-task-definition --cli-input-json "file://$env:TEMP/frontend-task-def.json" --region $AwsRegion
    
    Write-Info "Task definitions registered"
}

# Update ECS services
function Update-Services {
    Write-Info "Updating ECS services..."
    
    # Update backend service
    aws ecs update-service --cluster $ClusterName --service hrcrw-backend-service --task-definition hrcrw-backend --region $AwsRegion
    
    # Update frontend service
    aws ecs update-service --cluster $ClusterName --service hrcrw-frontend-service --task-definition hrcrw-frontend --region $AwsRegion
    
    Write-Info "Services updated"
}

# Wait for deployment to complete
function Wait-ForDeployment {
    Write-Info "Waiting for deployment to complete..."
    
    # Wait for backend service
    Write-Info "Waiting for backend service deployment..."
    aws ecs wait services-stable --cluster $ClusterName --services hrcrw-backend-service --region $AwsRegion
    
    # Wait for frontend service
    Write-Info "Waiting for frontend service deployment..."
    aws ecs wait services-stable --cluster $ClusterName --services hrcrw-frontend-service --region $AwsRegion
    
    Write-Info "Deployment completed successfully"
}

# Run database migrations
function Invoke-Migrations {
    Write-Info "Running database migrations..."
    
    # Get a running backend task
    $TaskArn = aws ecs list-tasks --cluster $ClusterName --service-name hrcrw-backend-service --desired-status RUNNING --region $AwsRegion --query 'taskArns[0]' --output text
    
    if ($TaskArn -and $TaskArn -ne "None") {
        Write-Info "Running migrations on task: $TaskArn"
        aws ecs execute-command --cluster $ClusterName --task $TaskArn --container hrcrw-backend --interactive --command "alembic upgrade head" --region $AwsRegion
    }
    else {
        Write-Warn "No running backend tasks found. Please run migrations manually."
    }
}

# Health check
function Test-Health {
    Write-Info "Performing health check..."
    
    $BackendRunning = aws ecs describe-services --cluster $ClusterName --services hrcrw-backend-service --region $AwsRegion --query 'services[0].runningCount' --output text
    $FrontendRunning = aws ecs describe-services --cluster $ClusterName --services hrcrw-frontend-service --region $AwsRegion --query 'services[0].runningCount' --output text
    
    if ([int]$BackendRunning -gt 0 -and [int]$FrontendRunning -gt 0) {
        Write-Info "Health check passed - services are running"
    }
    else {
        Write-Error "Health check failed - some services are not running"
        exit 1
    }
}

# Main deployment function
function Start-Deployment {
    Write-Info "Starting deployment for environment: $Environment"
    
    Test-Prerequisites
    New-EcrRepositories
    Build-AndPushImages
    Update-TaskDefinitions
    Register-TaskDefinitions
    Update-Services
    Wait-ForDeployment
    Invoke-Migrations
    Test-Health
    
    Write-Info "Deployment completed successfully!"
}

# Execute based on action parameter
switch ($Action) {
    "deploy" {
        Start-Deployment
    }
    "build" {
        Test-Prerequisites
        New-EcrRepositories
        Build-AndPushImages
    }
    "update" {
        Test-Prerequisites
        Update-TaskDefinitions
        Register-TaskDefinitions
        Update-Services
        Wait-ForDeployment
    }
    "migrate" {
        Invoke-Migrations
    }
    "health" {
        Test-Health
    }
    default {
        Write-Host "Usage: .\deploy.ps1 [deploy|build|update|migrate|health]"
        Write-Host "  deploy  - Full deployment (default)"
        Write-Host "  build   - Build and push images only"
        Write-Host "  update  - Update services only"
        Write-Host "  migrate - Run database migrations"
        Write-Host "  health  - Perform health check"
        exit 1
    }
}