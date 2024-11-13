# CoFounder API

## Summary of High-Impact Points

- Ensure you have Node.js (v14 or higher) and npm (v6 or higher) installed.
- Clone the repository and navigate to the `cofounder/api` directory.
- Create a `.env` file with the necessary environment variables.
- Install dependencies by running `npm install`.
- Start the server by running `npm run start`.
- Access the dashboard at `http://localhost:4200`.

## Overview

This API is part of the CoFounder project, which aims to provide a comprehensive platform for project management and AI-assisted development. The API includes various endpoints for managing projects, interacting with AI models, and handling utilities such as transcription.

## Setup

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Toowiredd/toocofounder.git
   cd toocofounder/cofounder/api
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the `cofounder/api` directory and add the necessary environment variables:
   ```plaintext
   PORT=4200
   LOCALAI_BASE_URL="http://localhost:5000"
   LOCALAI_API_KEY="your_local_ai_api_key"
   COFOUNDER_API_KEY="your_cofounder_api_key"
   LLM_PROVIDER="LOCALAI"
   EMBEDDING_MODEL="text-embedding-3-small"
   RAG_REMOTE_ENABLE=TRUE
   STATE_LOCAL=TRUE
   AUTOEXPORT_ENABLE=TRUE
   AUTOINSTALL_ENABLE=TRUE
   EXPORT_APPS_ROOT="../../apps"
   DESIGNER_ENABLE=TRUE
   DESIGNER_DESIGN_SYSTEM="presets/shadcn"
   SWARM_ENABLE=TRUE
   COFOUNDER_NICKNAME="Cofounder"
   ```

### Running the Server

To start the server, run:
```bash
npm run start
```

The server will be running on `http://localhost:4200`.

### Accessing the Dashboard

To access the dashboard, open your web browser and navigate to `http://localhost:4200`.

## API Endpoints

### General

- `GET /api/ping`: Check if the server is running.

### Projects

- `GET /api/projects/list`: List all projects.
- `POST /api/projects/new`: Create a new project.
  - Request body:
    ```json
    {
      "description": "Project description",
      "aesthetics": "Project aesthetics"
    }
    ```

### Utilities

- `POST /api/utils/transcribe`: Transcribe an audio file.
  - Request body:
    ```json
    {
      "audio": "base64_encoded_audio"
    }
    ```

### AI Model

- `POST /api/locallai/inference`: Perform inference using the locally hosted AI model.
  - Request body:
    ```json
    {
      "model": "local-model",
      "messages": [
        { "role": "system", "content": "You are a helpful assistant." },
        { "role": "user", "content: "Hello, how can I assist you today?" }
      ],
      "stream": false
    }
    ```

## Troubleshooting Tips

### Common Issues

1. **Server not starting**:
   - Ensure all dependencies are installed by running `npm install`.
   - Check the `.env` file for missing or incorrect environment variables.
   - Verify that the required ports are not in use by other applications.

2. **Dashboard not accessible**:
   - Ensure the server is running by checking the terminal output for any errors.
   - Verify that you are navigating to the correct URL: `http://localhost:4200`.

3. **API requests failing**:
   - Check the server logs for any error messages.
   - Ensure the API endpoints are correctly specified in your requests.

## Testing

### Running Tests

To run the tests, use:
```bash
npm test
```

### Test Structure

- Unit tests for individual functions are located in `cofounder/api/tests/llm.test.js`.
- Integration tests for API endpoints are located in `cofounder/api/tests/server.test.js`.

## Contribution

We welcome contributions to the CoFounder project. Please follow the guidelines in the `CONTRIBUTING.md` file.

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.
