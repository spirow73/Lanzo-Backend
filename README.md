# Lanzo Backend

![Lanzo Logo](lanzo-logo.png)

Lanzo Backend is the API that powers our infrastructure orchestration platform. It handles user requests, dynamically generates Terraform configurations, executes Terraform commands in ephemeral containers, and interacts with a MongoDB database to store configuration templates and deployment logs.

## Table of Contents
1. [Project Overview](#project-overview)
2. [Key Technologies](#key-technologies)
3. [Repository Structure](#repository-structure)
4. [Configuration & Setup](#configuration--setup)
   - [Prerequisites](#prerequisites)
   - [Installation](#installation)
   - [Environment Variables](#environment-variables)
5. [Example Files and Code](#example-files-and-code)
   - [package.json](#packagejson)
   - [Dockerfile](#dockerfile)
   - [docker-compose.yml](#docker-composeyml)
   - [.env](#env)
   - [src/app.js](#srcappjs)
6. [Development Workflow](#development-workflow)
7. [Testing](#testing)
8. [Deployment](#deployment)
9. [Troubleshooting](#troubleshooting)
10. [License](#license)
11. [Contact](#contact)

---

## Project Overview

Lanzo Backend is an API built with Node.js and Express. It serves as the bridge between the Lanzo frontend and the execution of Terraform to deploy pre-designed AWS infrastructures. The backend performs the following tasks:

- Receive and validate requests from the frontend.
- Dynamically generate Terraform files based on user inputs and stored templates.
- Execute Terraform commands (init, plan, apply) using ephemeral Docker containers.
- Manage deployment logs and configuration data in a MongoDB database.

---

## Key Technologies

- **Node.js & Express**: For building the API.
- **MongoDB**: For storing templates, deployment records, and user data.
- **Docker**: To containerize the backend and run Terraform in ephemeral containers.
- **Terraform (via container)**: To deploy infrastructure.
- **GitHub Actions**: For CI/CD (optional).
- **dotenv**: For managing environment variables.

---

## Repository Structure

A suggested folder structure for the repository:

```
lanzo-backend/
├── config/
│   └── database.js          # MongoDB connection configuration
├── src/
│   ├── controllers/         # Request controllers (e.g., deploymentController.js)
│   ├── routes/              # API routes (e.g., index.js, terraformRoutes.js)
│   ├── services/            # Services for Terraform execution, business logic, etc.
│   │   └── terraformService.js
│   ├── models/              # Mongoose models (e.g., Template.js, Deployment.js)
│   └── app.js               # Express app initialization
├── .env                     # Environment variables
├── .gitignore
├── package.json
├── Dockerfile
├── docker-compose.yml
└── README.md                # (This file)
```

---

## Configuration & Setup

### Prerequisites

Before starting, ensure you have installed:
- **Node.js** (v18+)
- **npm** or **yarn**
- **Docker** and **Docker Compose**
- **MongoDB** (or use the containerized version via Docker Compose)
- **Git**

### Installation

1. **Clone the Repository**

   ```bash
   git clone https://github.com/yourusername/lanzo-backend.git
   cd lanzo-backend
   ```

2. **Install Dependencies**

   ```bash
   npm install
   ```

### Environment Variables

Create a `.env` file at the root of your repository. For example:

```env
# .env
PORT=4000
MONGO_URI=mongodb://mongo:27017/lanzo
API_KEY=your_api_key_here
# Additional environment variables for Terraform execution can be added here.
```

---

## Example Files and Code

Below are some sample configuration files for your project.

### package.json

```json
{
  "name": "lanzo-backend",
  "version": "1.0.0",
  "description": "Backend API for Lanzo infrastructure orchestration platform",
  "main": "src/app.js",
  "scripts": {
    "start": "node src/app.js",
    "dev": "nodemon src/app.js",
    "lint": "eslint .",
    "test": "jest"
  },
  "dependencies": {
    "express": "^4.18.2",
    "mongoose": "^6.8.0",
    "dotenv": "^16.0.0",
    "body-parser": "^1.20.1"
  },
  "devDependencies": {
    "nodemon": "^2.0.20",
    "eslint": "^8.26.0",
    "jest": "^29.0.0"
  }
}
```

### Dockerfile

Create a `Dockerfile` to containerize the backend:

```dockerfile
# Dockerfile
FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application source
COPY . .

# Expose the port defined in the environment variables or default 4000
EXPOSE 4000

# Start the application
CMD ["npm", "start"]
```

### docker-compose.yml

Set up Docker Compose to run your backend alongside a MongoDB instance (and optionally a Terraform runner service):

```yaml
version: '3.8'
services:
  backend:
    build: .
    ports:
      - "4000:4000"
    environment:
      - PORT=4000
      - MONGO_URI=mongodb://mongo:27017/lanzo
    depends_on:
      - mongo

  mongo:
    image: mongo:5
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db

  # Optionally, you can add a terraform-runner service to execute Terraform commands
  terraform-runner:
    image: hashicorp/terraform:light
    volumes:
      - ./terraform:/workspace
    working_dir: /workspace
    # This service can be invoked on demand by the backend service

volumes:
  mongo_data:
```

### .env

As shown earlier, create a `.env` file:

```env
PORT=4000
MONGO_URI=mongodb://mongo:27017/lanzo
API_KEY=your_api_key_here
```

### src/app.js

A basic Express app setup:

```js
// src/app.js
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const routes = require('./routes'); // Import your route definitions

const app = express();
const port = process.env.PORT || 4000;

// Middleware
app.use(bodyParser.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});
mongoose.connection.on('connected', () => {
  console.log('Connected to MongoDB');
});
mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

// Routes
app.use('/api', routes);

// Basic health-check route
app.get('/health', (req, res) => {
  res.send('Lanzo Backend is running!');
});

// Start the server
app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
```

---

## Development Workflow

1. **Local Development**:  
   Run the backend locally using Node or Docker Compose:
   ```bash
   npm run dev
   ```
   Or with Docker Compose:
   ```bash
   docker-compose up --build
   ```

2. **Making Changes**:  
   Use a branching strategy (e.g., GitFlow) for feature development. Push your changes to GitHub and open a pull request for review.

3. **Testing**:  
   Write and run unit tests with Jest:
   ```bash
   npm run test
   ```

---

## Deployment

- **Docker & ECS**:  
  When deploying, build the Docker image, push it to a container registry (e.g., Amazon ECR), and update your ECS service accordingly.  
- **CI/CD**:  
  Consider setting up GitHub Actions to automate testing and deployments.

---

## Testing

- **Unit Testing**:  
  Run tests using Jest:
  ```bash
  npm run test
  ```
- **Linting**:  
  Ensure code quality using ESLint:
  ```bash
  npm run lint
  ```

---

## Troubleshooting

### Common Issues

- **MongoDB Connection**:  
  Verify your `MONGO_URI` in the `.env` file and ensure MongoDB is running.
- **Docker Build Errors**:  
  Ensure your Dockerfile copies all necessary files and that dependencies are correctly installed.
- **Port Conflicts**:  
  Make sure the port defined in `.env` is not being used by another service.

### Getting Help

If you encounter any issues, please open an issue on the [GitHub issue tracker](https://github.com/yourusername/lanzo-backend/issues) with detailed information and steps to reproduce the problem.

---

## License

TBD

---

## Contact

For questions or support, please contact:
- **Email**: support@lanzo.io