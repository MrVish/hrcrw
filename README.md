# High Risk Client Review Workflow

A comprehensive web application for managing AML/CTF compliance processes with maker-checker approval workflows, exception handling, document management, and complete audit trails.

## Project Structure

```
├── backend/                 # FastAPI backend application
│   ├── app/
│   │   ├── api/            # API routes and endpoints
│   │   ├── core/           # Core configuration and database
│   │   ├── models/         # SQLAlchemy database models
│   │   ├── schemas/        # Pydantic request/response schemas
│   │   ├── services/       # Business logic services
│   │   └── utils/          # Utility functions
│   ├── requirements.txt    # Python dependencies
│   ├── Dockerfile         # Docker configuration
│   └── run.py             # Development server startup
├── frontend/               # React frontend (to be implemented)
├── docker-compose.yml      # Docker Compose configuration
└── README.md              # This file
```

## Technology Stack

- **Backend**: FastAPI with Python 3.11
- **Database**: PostgreSQL with SQLAlchemy ORM
- **Authentication**: JWT tokens with role-based access control
- **File Storage**: AWS S3 with pre-signed URLs
- **Email**: AWS SES for notifications
- **Containerization**: Docker and Docker Compose

## Quick Start

### Prerequisites

- Python 3.11+
- Docker and Docker Compose
- PostgreSQL (for production)

### Development Setup

1. **Clone the repository and navigate to the project directory**

2. **Start the development environment with Docker Compose:**
   ```bash
   docker-compose up -d
   ```

3. **Or run locally with Python:**
   ```bash
   cd backend
   pip install -r requirements.txt
   python run.py
   ```

4. **Access the application:**
   - API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs
   - Health Check: http://localhost:8000/health

### Environment Configuration

Copy the example environment file and update with your settings:

```bash
cd backend
cp .env.example .env
# Edit .env with your configuration
```

### Database Setup

The application will automatically create database tables on startup. For production, ensure PostgreSQL is running and update the `DATABASE_URL` in your `.env` file.

## API Documentation

Once the application is running, visit http://localhost:8000/docs for interactive API documentation powered by Swagger UI.

## Development

### Running Tests

```bash
cd backend
pytest
```

### Code Style

The project follows PEP 8 standards. Use tools like `black` and `flake8` for code formatting and linting.

## Deployment

The application is designed for deployment on AWS ECS with:
- PostgreSQL RDS for the database
- S3 for document storage
- SES for email notifications
- Application Load Balancer for traffic distribution

## Security Features

- JWT-based authentication
- Role-based access control (Maker, Checker, Admin)
- CORS protection
- Trusted host middleware
- Secure document handling with pre-signed URLs
- Comprehensive audit logging

## Contributing

1. Follow the existing code structure and patterns
2. Write tests for new functionality
3. Update documentation as needed
4. Ensure all tests pass before submitting changes

## License

This project is proprietary and confidential.