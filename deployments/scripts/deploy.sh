#!/bin/bash

# ADES Deployment Script
# This script deploys ADES to a Kubernetes cluster

set -e

# Configuration
NAMESPACE="ades-system"
DOCKER_REGISTRY="ghcr.io"
IMAGE_NAME="ades"
VERSION="${VERSION:-latest}"
ENVIRONMENT="${ENVIRONMENT:-production}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if kubectl is installed
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed. Please install kubectl first."
        exit 1
    fi
    
    # Check if docker is installed
    if ! command -v docker &> /dev/null; then
        log_error "docker is not installed. Please install docker first."
        exit 1
    fi
    
    # Check if we can connect to Kubernetes cluster
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster. Please check your kubeconfig."
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Build Docker image
build_image() {
    log_info "Building Docker image..."
    
    docker build -t ${DOCKER_REGISTRY}/${IMAGE_NAME}:${VERSION} .
    
    if [ $? -eq 0 ]; then
        log_success "Docker image built successfully"
    else
        log_error "Failed to build Docker image"
        exit 1
    fi
}

# Push Docker image
push_image() {
    log_info "Pushing Docker image to registry..."
    
    docker push ${DOCKER_REGISTRY}/${IMAGE_NAME}:${VERSION}
    
    if [ $? -eq 0 ]; then
        log_success "Docker image pushed successfully"
    else
        log_error "Failed to push Docker image"
        exit 1
    fi
}

# Create namespace
create_namespace() {
    log_info "Creating namespace ${NAMESPACE}..."
    
    kubectl apply -f deployments/kubernetes/namespace.yaml
    
    if [ $? -eq 0 ]; then
        log_success "Namespace created/updated successfully"
    else
        log_error "Failed to create namespace"
        exit 1
    fi
}

# Deploy ADES
deploy_ades() {
    log_info "Deploying ADES to Kubernetes..."
    
    # Update image tag in deployment
    sed -i.bak "s|image: ades:latest|image: ${DOCKER_REGISTRY}/${IMAGE_NAME}:${VERSION}|g" deployments/kubernetes/deployment.yaml
    
    # Apply Kubernetes manifests
    kubectl apply -f deployments/kubernetes/configmap.yaml
    kubectl apply -f deployments/kubernetes/pvc.yaml
    kubectl apply -f deployments/kubernetes/service.yaml
    kubectl apply -f deployments/kubernetes/deployment.yaml
    
    # Restore original deployment file
    mv deployments/kubernetes/deployment.yaml.bak deployments/kubernetes/deployment.yaml
    
    if [ $? -eq 0 ]; then
        log_success "ADES deployed successfully"
    else
        log_error "Failed to deploy ADES"
        exit 1
    fi
}

# Wait for deployment
wait_for_deployment() {
    log_info "Waiting for deployment to be ready..."
    
    kubectl rollout status deployment/ades-deployment -n ${NAMESPACE} --timeout=600s
    
    if [ $? -eq 0 ]; then
        log_success "Deployment is ready"
    else
        log_error "Deployment failed to become ready"
        exit 1
    fi
}

# Run health checks
health_check() {
    log_info "Running health checks..."
    
    # Wait for pods to be ready
    kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=ades -n ${NAMESPACE} --timeout=300s
    
    # Get service URL
    SERVICE_IP=$(kubectl get service ades-loadbalancer -n ${NAMESPACE} -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "localhost")
    SERVICE_PORT=$(kubectl get service ades-service -n ${NAMESPACE} -o jsonpath='{.spec.ports[0].port}')
    
    if [ "$SERVICE_IP" = "localhost" ]; then
        # Use port-forward for local testing
        log_info "Using port-forward for health check..."
        kubectl port-forward service/ades-service ${SERVICE_PORT}:${SERVICE_PORT} -n ${NAMESPACE} &
        PORT_FORWARD_PID=$!
        sleep 5
        SERVICE_URL="http://localhost:${SERVICE_PORT}"
    else
        SERVICE_URL="http://${SERVICE_IP}:${SERVICE_PORT}"
    fi
    
    # Test health endpoint
    if curl -f "${SERVICE_URL}/api/health" &> /dev/null; then
        log_success "Health check passed"
    else
        log_error "Health check failed"
        if [ ! -z "$PORT_FORWARD_PID" ]; then
            kill $PORT_FORWARD_PID
        fi
        exit 1
    fi
    
    # Test main endpoints
    if curl -f "${SERVICE_URL}/api/commits" &> /dev/null; then
        log_success "API endpoints are responding"
    else
        log_warning "Some API endpoints may not be ready yet"
    fi
    
    if [ ! -z "$PORT_FORWARD_PID" ]; then
        kill $PORT_FORWARD_PID
    fi
}

# Show deployment info
show_deployment_info() {
    log_info "Deployment Information:"
    echo "========================"
    echo "Namespace: ${NAMESPACE}"
    echo "Image: ${DOCKER_REGISTRY}/${IMAGE_NAME}:${VERSION}"
    echo "Environment: ${ENVIRONMENT}"
    echo ""
    
    log_info "Service Information:"
    kubectl get services -n ${NAMESPACE}
    echo ""
    
    log_info "Pod Information:"
    kubectl get pods -n ${NAMESPACE}
    echo ""
    
    log_info "Deployment Status:"
    kubectl get deployments -n ${NAMESPACE}
}

# Cleanup function
cleanup() {
    if [ ! -z "$PORT_FORWARD_PID" ]; then
        kill $PORT_FORWARD_PID 2>/dev/null
    fi
}

# Set trap for cleanup
trap cleanup EXIT

# Main deployment flow
main() {
    log_info "Starting ADES deployment..."
    echo "Environment: ${ENVIRONMENT}"
    echo "Version: ${VERSION}"
    echo "Namespace: ${NAMESPACE}"
    echo ""
    
    check_prerequisites
    
    if [ "${SKIP_BUILD}" != "true" ]; then
        build_image
        
        if [ "${SKIP_PUSH}" != "true" ]; then
            push_image
        fi
    fi
    
    create_namespace
    deploy_ades
    wait_for_deployment
    health_check
    show_deployment_info
    
    log_success "ADES deployment completed successfully!"
    echo ""
    echo "Access ADES at:"
    echo "- Main UI: http://<service-ip>:8080"
    echo "- IDE Integration: http://<service-ip>:8081"
    echo "- Collaboration: http://<service-ip>:8082"
    echo "- Visualization: http://<service-ip>:8083"
    echo "- Metrics: http://<service-ip>:9090/metrics"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-build)
            SKIP_BUILD="true"
            shift
            ;;
        --skip-push)
            SKIP_PUSH="true"
            shift
            ;;
        --version)
            VERSION="$2"
            shift 2
            ;;
        --environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --skip-build     Skip Docker image build"
            echo "  --skip-push      Skip Docker image push"
            echo "  --version        Set image version (default: latest)"
            echo "  --environment    Set environment (default: production)"
            echo "  --help           Show this help message"
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Run main function
main 