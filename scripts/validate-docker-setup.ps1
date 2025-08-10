# ScrumiX Docker Setup Validation Script (PowerShell)
# Validates that all Docker-related files are properly configured

param(
    [switch]$Detailed = $false
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

$ERRORS = 0
$WARNINGS = 0

function Test-FileExists {
    param(
        [string]$FilePath,
        [string]$Description
    )
    
    if (Test-Path $FilePath) {
        Write-Success "$Description exists: $FilePath"
        return $true
    } else {
        Write-Error "$Description missing: $FilePath"
        $script:ERRORS++
        return $false
    }
}

function Test-Dockerfile {
    param(
        [string]$DockerfilePath,
        [string]$ServiceName
    )
    
    Write-Info "Checking $ServiceName Dockerfile..."
    
    if (!(Test-Path $DockerfilePath)) {
        Write-Error "$ServiceName Dockerfile missing: $DockerfilePath"
        $script:ERRORS++
        return
    }
    
    $content = Get-Content $DockerfilePath -Raw
    
    # Check for required instructions
    $requiredInstructions = @("FROM", "WORKDIR", "COPY", "RUN", "EXPOSE", "CMD")
    
    foreach ($instruction in $requiredInstructions) {
        if ($content -match "(?m)^$instruction") {
            Write-Success "$ServiceName Dockerfile has $instruction instruction"
        } else {
            Write-Warning "$ServiceName Dockerfile missing $instruction instruction"
            $script:WARNINGS++
        }
    }
    
    # Check for health check
    if ($content -match "HEALTHCHECK") {
        Write-Success "$ServiceName Dockerfile has health check"
    } else {
        Write-Warning "$ServiceName Dockerfile missing health check"
        $script:WARNINGS++
    }
    
    # Check for .dockerignore
    $dockerignorePath = Join-Path (Split-Path $DockerfilePath) ".dockerignore"
    if (Test-Path $dockerignorePath) {
        Write-Success "$ServiceName has .dockerignore file"
    } else {
        Write-Warning "$ServiceName missing .dockerignore file"
        $script:WARNINGS++
    }
}

function Test-ComposeFile {
    param(
        [string]$ComposeFilePath,
        [string]$Environment
    )
    
    Write-Info "Checking $Environment docker-compose file..."
    
    if (!(Test-Path $ComposeFilePath)) {
        Write-Error "$Environment docker-compose file missing: $ComposeFilePath"
        $script:ERRORS++
        return
    }
    
    $content = Get-Content $ComposeFilePath -Raw
    
    # Check for required services (flexible naming)
    if ($content -match "(?m)^\s+.*postgres.*:") {
        Write-Success "$Environment compose has PostgreSQL service"
    } else {
        Write-Error "$Environment compose missing PostgreSQL service"
        $script:ERRORS++
    }
    
    # Check for volumes
    if ($content -match "(?m)^volumes:") {
        Write-Success "$Environment compose has volumes section"
    } else {
        Write-Warning "$Environment compose missing volumes section"
        $script:WARNINGS++
    }
    
    # Check for networks
    if ($content -match "(?m)^networks:") {
        Write-Success "$Environment compose has networks section"
    } else {
        Write-Warning "$Environment compose missing networks section"
        $script:WARNINGS++
    }
}

function Test-AlembicConfig {
    Write-Info "Checking Alembic configuration..."
    
    # Check alembic.ini
    if (Test-Path "backend/alembic.ini") {
        Write-Success "Alembic configuration file exists"
    } else {
        Write-Error "Alembic configuration file missing: backend/alembic.ini"
        $script:ERRORS++
    }
    
    # Check env.py
    if (Test-Path "backend/alembic/env.py") {
        Write-Success "Alembic env.py exists"
        
        $envContent = Get-Content "backend/alembic/env.py" -Raw
        
        # Check if env.py is properly configured
        if ($envContent -match "from scrumix\.api\.core\.config import settings") {
            Write-Success "Alembic env.py imports settings"
        } else {
            Write-Error "Alembic env.py missing settings import"
            $script:ERRORS++
        }
        
        if ($envContent -match "from scrumix\.api\.db\.base import Base") {
            Write-Success "Alembic env.py imports Base"
        } else {
            Write-Error "Alembic env.py missing Base import"
            $script:ERRORS++
        }
    } else {
        Write-Error "Alembic env.py missing: backend/alembic/env.py"
        $script:ERRORS++
    }
    
    # Check versions directory
    if (Test-Path "backend/alembic/versions") {
        Write-Success "Alembic versions directory exists"
        
        # Check if there are migration files
        $migrationFiles = Get-ChildItem "backend/alembic/versions/*.py" -ErrorAction SilentlyContinue
        if ($migrationFiles.Count -gt 0) {
            Write-Success "Alembic has migration files"
        } else {
            Write-Warning "Alembic versions directory is empty"
            $script:WARNINGS++
        }
    } else {
        Write-Error "Alembic versions directory missing: backend/alembic/versions"
        $script:ERRORS++
    }
}

function Test-NextConfig {
    Write-Info "Checking Next.js configuration..."
    
    if (Test-Path "frontend/next.config.ts") {
        Write-Success "Next.js config file exists"
        
        $configContent = Get-Content "frontend/next.config.ts" -Raw
        
        # Check for standalone output
        if ($configContent -match "output.*standalone") {
            Write-Success "Next.js configured for standalone output"
        } else {
            Write-Warning "Next.js not configured for standalone output (required for Docker)"
            $script:WARNINGS++
        }
    } else {
        Write-Error "Next.js config file missing: frontend/next.config.ts"
        $script:ERRORS++
    }
}

function Test-EnvironmentTemplates {
    Write-Info "Checking environment templates..."
    
    # Check backend env template
    if (Test-Path "docker/env.template") {
        Write-Success "Environment template exists"
        
        $envContent = Get-Content "docker/env.template" -Raw
        
        # Check for required variables
        $requiredVars = @("POSTGRES_USER", "POSTGRES_PASSWORD", "POSTGRES_DB", "SECRET_KEY")
        
        foreach ($var in $requiredVars) {
            if ($envContent -match "$var=") {
                Write-Success "Environment template has $var"
            } else {
                Write-Error "Environment template missing $var"
                $script:ERRORS++
            }
        }
    } else {
        Write-Error "Environment template missing: docker/env.template"
        $script:ERRORS++
    }
}

function Test-Scripts {
    Write-Info "Checking deployment scripts..."
    
    # Check deployment script
    if (Test-Path "docker/deploy.sh") {
        Write-Success "Deployment script exists"
    } else {
        Write-Error "Deployment script missing: docker/deploy.sh"
        $script:ERRORS++
    }
    
    # Check local testing scripts
    if (Test-Path "scripts/test-local-docker.sh") {
        Write-Success "Local testing script (Bash) exists"
    } else {
        Write-Warning "Local testing script (Bash) missing: scripts/test-local-docker.sh"
        $script:WARNINGS++
    }
    
    if (Test-Path "scripts/test-local-docker.ps1") {
        Write-Success "Local testing script (PowerShell) exists"
    } else {
        Write-Warning "Local testing script (PowerShell) missing: scripts/test-local-docker.ps1"
        $script:WARNINGS++
    }
}

function Main {
    Write-Info "Starting ScrumiX Docker setup validation..."
    Write-Host ""
    
    # Check Dockerfiles
    Test-Dockerfile "backend/Dockerfile" "Backend"
    Test-Dockerfile "frontend/Dockerfile" "Frontend"
    Write-Host ""
    
    # Check docker-compose files
    Test-ComposeFile "docker/docker-compose.local.yaml" "Local"
    Test-ComposeFile "docker/docker-compose.prod.yaml" "Production"
    Write-Host ""
    
    # Check Alembic configuration
    Test-AlembicConfig
    Write-Host ""
    
    # Check Next.js configuration
    Test-NextConfig
    Write-Host ""
    
    # Check environment templates
    Test-EnvironmentTemplates
    Write-Host ""
    
    # Check scripts
    Test-Scripts
    Write-Host ""
    
    # Check nginx configuration
    Write-Info "Checking Nginx configuration..."
    Test-FileExists "docker/nginx/nginx.conf" "Nginx main config" | Out-Null
    Test-FileExists "docker/nginx/conf.d/scrumix.conf" "Nginx site config" | Out-Null
    Write-Host ""
    
    # Check documentation
    Write-Info "Checking documentation..."
    Test-FileExists "docker/README.md" "Docker deployment guide" | Out-Null
    Write-Host ""
    
    # Summary
    Write-Info "Validation Summary:"
    if ($ERRORS -eq 0) {
        Write-Success "No critical errors found!"
    } else {
        Write-Error "Found $ERRORS critical error(s) that must be fixed"
    }
    
    if ($WARNINGS -eq 0) {
        Write-Success "No warnings found!"
    } else {
        Write-Warning "Found $WARNINGS warning(s) that should be addressed"
    }
    
    Write-Host ""
    if ($ERRORS -eq 0) {
        Write-Success "Docker setup validation PASSED!"
        Write-Info "You can proceed with local testing using:"
        Write-Host "  .\scripts\test-local-docker.ps1" -ForegroundColor White
        Write-Host "Or for Linux/Mac:" -ForegroundColor Gray
        Write-Host "  ./scripts/test-local-docker.sh" -ForegroundColor Gray
        exit 0
    } else {
        Write-Error "Docker setup validation FAILED!"
        Write-Info "Please fix the critical errors and run validation again."
        exit 1
    }
}

Main
