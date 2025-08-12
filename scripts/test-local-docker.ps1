# ScrumiX Local Docker Testing Script (PowerShell)
# This script helps test the Docker setup locally on Windows

param(
    [string]$Command = "full"
)

# Colors for output
$RED = "Red"
$GREEN = "Green"
$YELLOW = "Yellow"
$BLUE = "Cyan"

function Write-Info($message) {
    Write-Host "[INFO] $message" -ForegroundColor $BLUE
}

function Write-Success($message) {
    Write-Host "[SUCCESS] $message" -ForegroundColor $GREEN
}

function Write-Warning($message) {
    Write-Host "[WARNING] $message" -ForegroundColor $YELLOW
}

function Write-Error($message) {
    Write-Host "[ERROR] $message" -ForegroundColor $RED
}

# Configuration
$BACKEND_DIR = "backend"
$FRONTEND_DIR = "frontend"
$DOCKER_DIR = "docker"

function Test-Prerequisites {
    Write-Info "Checking prerequisites..."
    
    # Check if Docker is installed
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        Write-Error "Docker is not installed. Please install Docker Desktop first."
        exit 1
    }
    
    # Check if Docker Compose is installed
    if (-not (Get-Command docker-compose -ErrorAction SilentlyContinue)) {
        Write-Error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    }
    
    # Check if we're in the right directory
    if (-not (Test-Path $BACKEND_DIR) -or -not (Test-Path $FRONTEND_DIR)) {
        Write-Error "Please run this script from the ScrumiX project root directory."
        exit 1
    }
    
    Write-Success "Prerequisites check passed"
}

function Setup-LocalEnv {
    Write-Info "Setting up local environment..."
    
    # Create backend .env if it doesn't exist
    if (-not (Test-Path "$BACKEND_DIR\.env")) {
        Write-Warning "Creating backend/.env file..."
        $envContent = @"
# Database
POSTGRES_USER=admin
POSTGRES_PASSWORD=postgres
POSTGRES_DB=scrumix
POSTGRES_SERVER=localhost
POSTGRES_PORT=5433

# App
SECRET_KEY=local-development-secret-key-change-in-production
ENVIRONMENT=development

# URLs
BACKEND_URL=http://localhost:8000
FRONTEND_URL=http://localhost:3000
"@
        $envContent | Out-File -FilePath "$BACKEND_DIR\.env" -Encoding UTF8
        Write-Success "Created $BACKEND_DIR\.env"
    }
    
    # Create frontend .env.local if it doesn't exist
    if (-not (Test-Path "$FRONTEND_DIR\.env.local")) {
        Write-Warning "Creating frontend/.env.local file..."
        $envContent = @"
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
NODE_ENV=development
"@
        $envContent | Out-File -FilePath "$FRONTEND_DIR\.env.local" -Encoding UTF8
        Write-Success "Created $FRONTEND_DIR\.env.local"
    }
    
    Write-Success "Environment setup completed"
}

function Start-Database {
    Write-Info "Starting PostgreSQL database..."
    
    # Start only PostgreSQL using local compose
    Push-Location $DOCKER_DIR
    docker-compose -f docker-compose.local.yaml up -d scrumix-postgres
    Pop-Location
    
    # Wait for database to be ready
    Write-Info "Waiting for database to be ready..."
    Start-Sleep -Seconds 10
    
    # Check if database is ready
    $result = docker exec docker-scrumix-postgres-1 pg_isready -U admin -d scrumix 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Database is ready"
    }
    else {
        Write-Error "Database failed to start properly"
        exit 1
    }
}

function Test-Backend {
    Write-Info "Testing backend..."
    
    Push-Location $BACKEND_DIR
    
    try {
        # Run database migrations
        Write-Info "Running database migrations..."
        $result = python -m alembic upgrade head
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Database migrations completed"
        }
        else {
            Write-Error "Database migrations failed"
            return $false
        }
        
        # Start backend in background
        Write-Info "Starting backend server..."
        $backendJob = Start-Job -ScriptBlock {
            Set-Location $using:PWD
            uvicorn scrumix.api.app:app --host 0.0.0.0 --port 8000
        }
        
        # Wait for backend to start
        Start-Sleep -Seconds 5
        
        # Test backend health endpoint
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:8000/health" -Method GET -TimeoutSec 10
            if ($response.StatusCode -eq 200) {
                Write-Success "Backend health check passed"
                
                # Test API endpoints
                Write-Info "Testing API endpoints..."
                
                try {
                    $response = Invoke-WebRequest -Uri "http://localhost:8000/api/v1/projects" -Method GET -TimeoutSec 10
                    Write-Success "Projects API endpoint working"
                }
                catch {
                    Write-Warning "Projects API endpoint not accessible (might need authentication)"
                }
                
                Stop-Job $backendJob -ErrorAction SilentlyContinue
                Remove-Job $backendJob -ErrorAction SilentlyContinue
                return $true
            }
        }
        catch {
            Write-Error "Backend health check failed: $_"
            Stop-Job $backendJob -ErrorAction SilentlyContinue
            Remove-Job $backendJob -ErrorAction SilentlyContinue
            return $false
        }
    }
    finally {
        Pop-Location
    }
}

function Test-Frontend {
    Write-Info "Testing frontend..."
    
    Push-Location $FRONTEND_DIR
    
    try {
        # Install dependencies if needed
        if (-not (Test-Path "node_modules")) {
            Write-Info "Installing frontend dependencies..."
            npm install
        }
        
        # Build frontend
        Write-Info "Building frontend..."
        $result = npm run build
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Frontend build successful"
            
            # Start frontend in background
            Write-Info "Starting frontend server..."
            $frontendJob = Start-Job -ScriptBlock {
                Set-Location $using:PWD
                npm start
            }
            
            # Wait for frontend to start
            Start-Sleep -Seconds 10
            
            # Test frontend
            try {
                $response = Invoke-WebRequest -Uri "http://localhost:3000" -Method GET -TimeoutSec 10
                if ($response.StatusCode -eq 200) {
                    Write-Success "Frontend is accessible"
                    Stop-Job $frontendJob -ErrorAction SilentlyContinue
                    Remove-Job $frontendJob -ErrorAction SilentlyContinue
                    return $true
                }
            }
            catch {
                Write-Error "Frontend is not accessible: $_"
                Stop-Job $frontendJob -ErrorAction SilentlyContinue
                Remove-Job $frontendJob -ErrorAction SilentlyContinue
                return $false
            }
        }
        else {
            Write-Error "Frontend build failed"
            return $false
        }
    }
    finally {
        Pop-Location
    }
}

function Test-DockerBuild {
    Write-Info "Testing Docker builds..."
    
    # Test backend Docker build
    Write-Info "Building backend Docker image..."
    $result = docker build -t scrumix-backend:test $BACKEND_DIR
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Backend Docker build successful"
    }
    else {
        Write-Error "Backend Docker build failed"
        return $false
    }
    
    # Test frontend Docker build
    Write-Info "Building frontend Docker image..."
    $result = docker build -t scrumix-frontend:test $FRONTEND_DIR
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Frontend Docker build successful"
    }
    else {
        Write-Error "Frontend Docker build failed"
        return $false
    }
    
    # Clean up test images
    docker rmi scrumix-backend:test scrumix-frontend:test 2>$null
    
    Write-Success "Docker builds completed successfully"
    return $true
}

function Cleanup {
    Write-Info "Cleaning up..."
    
    # Stop any running jobs
    Get-Job | Stop-Job -ErrorAction SilentlyContinue
    Get-Job | Remove-Job -ErrorAction SilentlyContinue
    
    # Stop database
    Push-Location $DOCKER_DIR
    docker-compose -f docker-compose.local.yaml down 2>$null
    Pop-Location
    
    Write-Success "Cleanup completed"
}

# Main script
switch ($Command) {
    "prereq" {
        Test-Prerequisites
    }
    "env" {
        Test-Prerequisites
        Setup-LocalEnv
    }
    "db" {
        Test-Prerequisites
        Setup-LocalEnv
        Start-Database
    }
    "backend" {
        Test-Prerequisites
        Setup-LocalEnv
        Start-Database
        Test-Backend
    }
    "frontend" {
        Test-Prerequisites
        Setup-LocalEnv
        Test-Frontend
    }
    "docker" {
        Test-Prerequisites
        Test-DockerBuild
    }
    "full" {
        Write-Info "Running full local Docker test..."
        Test-Prerequisites
        Setup-LocalEnv
        Start-Database
        
        if (Test-Backend) {
            Write-Success "Backend test passed"
        }
        else {
            Write-Error "Backend test failed"
            Cleanup
            exit 1
        }
        
        if (Test-Frontend) {
            Write-Success "Frontend test passed"
        }
        else {
            Write-Error "Frontend test failed"
            Cleanup
            exit 1
        }
        
        if (Test-DockerBuild) {
            Write-Success "Docker build tests passed"
        }
        else {
            Write-Error "Docker build tests failed"
            Cleanup
            exit 1
        }
        
        Cleanup
        Write-Success "All tests passed! Docker setup is ready."
    }
    "cleanup" {
        Cleanup
    }
    default {
        Write-Host "ScrumiX Local Docker Testing Script (PowerShell)" -ForegroundColor $BLUE
        Write-Host ""
        Write-Host "Usage: .\test-local-docker.ps1 [command]" -ForegroundColor $BLUE
        Write-Host ""
        Write-Host "Commands:" -ForegroundColor $BLUE
        Write-Host "  prereq    - Check prerequisites only"
        Write-Host "  env       - Set up environment files"
        Write-Host "  db        - Start database and test connection"
        Write-Host "  backend   - Test backend functionality"
        Write-Host "  frontend  - Test frontend functionality"
        Write-Host "  docker    - Test Docker builds"
        Write-Host "  full      - Run all tests (default)"
        Write-Host "  cleanup   - Clean up running processes"
        Write-Host "  help      - Show this help message"
        Write-Host ""
        Write-Host "Examples:" -ForegroundColor $BLUE
        Write-Host "  .\test-local-docker.ps1              # Run full test suite"
        Write-Host "  .\test-local-docker.ps1 backend      # Test only backend"
        Write-Host "  .\test-local-docker.ps1 docker       # Test only Docker builds"
    }
}
