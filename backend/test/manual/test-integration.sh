#!/bin/bash

# Colors for better readability
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'
BLUE='\033[0;34m'

# Configuration
BACKEND_URL="http://localhost:3000"
MOCK_API_URL="http://localhost:3002"

# Helper Functions
log_step() {
    echo -e "\n${BLUE}Step: $1${NC}"
}

log_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

log_error() {
    echo -e "${RED}✗ Error: $1${NC}"
    exit 1
}

# Check if backend is running
log_step "Checking if backend server is running"
if ! curl -s "$BACKEND_URL/api/tests/debug" > /dev/null; then
    log_error "Backend server is not running. Please start it with 'npm run dev'"
fi
log_success "Backend server is running"

# Check if mock API is running
log_step "Checking if mock API is running"
if ! curl -s "$MOCK_API_URL/users" > /dev/null; then
    log_error "Mock API is not running. Please ensure test server is running on port 3002"
fi
log_success "Mock API is running"

# Define a simple API spec matching our mock API
log_step "Preparing API specification"
API_SPEC='{
    "openapi": "3.0.0",
    "info": {
        "title": "Mock API",
        "version": "1.0.0"
    },
    "paths": {
        "/users": {
            "get": {
                "responses": {
                    "200": {
                        "description": "List of users"
                    }
                }
            }
        },
        "/users/{id}": {
            "get": {
                "parameters": [
                    {
                        "name": "id",
                        "in": "path",
                        "required": true,
                        "schema": {
                            "type": "integer"
                        }
                    }
                ],
                "responses": {
                    "200": {
                        "description": "User details"
                    },
                    "404": {
                        "description": "User not found"
                    }
                }
            }
        }
    }
}'

# Step 1: Generate test cases
log_step "Generating test cases from API spec"
GENERATE_RESPONSE=$(curl -s -X POST "$BACKEND_URL/api/tests/generate" \
    -H "Content-Type: application/json" \
    -d "$API_SPEC")

GENERATION_ID=$(echo "$GENERATE_RESPONSE" | jq -r '.id')
if [ "$GENERATION_ID" = "null" ] || [ -z "$GENERATION_ID" ]; then
    log_error "Failed to generate tests. Response: $GENERATE_RESPONSE"
fi
log_success "Generated tests with ID: $GENERATION_ID"

# Step 2: Verify generated test cases
log_step "Verifying generated test cases"
TEST_CASES=$(curl -s "$BACKEND_URL/api/tests/generated/$GENERATION_ID")
TEST_COUNT=$(echo "$TEST_CASES" | jq '.testCases | length')
if [ "$TEST_COUNT" -eq 0 ]; then
    log_error "No test cases were generated"
fi
log_success "Generated $TEST_COUNT test cases"

# Step 3: Run tests against mock API
log_step "Running tests against mock API"
RUN_RESPONSE=$(curl -s -X POST "$BACKEND_URL/api/tests/run" \
    -H "Content-Type: application/json" \
    -d "{
        \"baseUrl\": \"$MOCK_API_URL\",
        \"generationId\": \"$GENERATION_ID\"
    }")

RUN_ID=$(echo "$RUN_RESPONSE" | jq -r '.id')
if [ "$RUN_ID" = "null" ] || [ -z "$RUN_ID" ]; then
    log_error "Failed to run tests. Response: $RUN_RESPONSE"
fi

# Step 4: Analyze test results
log_step "Analyzing test results"
RESULTS=$(curl -s "$BACKEND_URL/api/tests/$RUN_ID")
TOTAL_TESTS=$(echo "$RESULTS" | jq '.summary.total')
PASSED_TESTS=$(echo "$RESULTS" | jq '.summary.passed')
FAILED_TESTS=$(echo "$RESULTS" | jq '.summary.failed')

echo -e "\nTest Results Summary:"
echo "Total Tests: $TOTAL_TESTS"
echo "Passed: $PASSED_TESTS"
echo "Failed: $FAILED_TESTS"

if [ "$FAILED_TESTS" -gt 0 ]; then
    echo -e "\n${RED}Failed Tests Details:${NC}"
    echo "$RESULTS" | jq '.results[] | select(.passed == false) | {name, endpoint, error}'
    exit 1
fi

log_success "All tests passed successfully"