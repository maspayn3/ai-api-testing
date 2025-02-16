# AI-Powered API Testing Framework

A modern API testing framework that leverages Google's Gemini AI to automatically generate and execute comprehensive test suites. Supports OpenAPI specifications and direct API endpoint definitions.

## Features

- AI-powered test case generation from API specifications
- Parallel test execution with configurable concurrency
- Real-time test results dashboard
- Detailed assertion handling and reporting
- Automatic edge case detection
- Test coverage analysis

## Quick Start

### Prerequisites

- Node.js >= 16.x
- npm >= 8.x

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/ai-api-testing.git

# Install backend dependencies
cd ai-api-testing/backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Configuration

Create a `.env` file in the backend directory:

```env
GEMINI_API_KEY=your_api_key_here
PORT=3000
```

### Running the Application

```bash
# Start backend
cd backend
npm run dev

# Start frontend (in a new terminal)
cd frontend
npm run dev
```

Visit `http://localhost:5173` to access the dashboard.

## Tech Stack

- Frontend: React, TypeScript, TailwindCSS, React Query
- Backend: Node.js, Express, TypeScript
- AI: Google Gemini
- Testing: Jest

## Usage

1. Input your API specification (OpenAPI format supported)
2. Configure test generation parameters
3. Execute test suite with parallel processing
4. View detailed results in the dashboard

## Contributing

Contributions are welcome. Please feel free to submit a Pull Request.

## License

This project is MIT licensed.