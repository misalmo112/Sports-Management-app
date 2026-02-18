# API Naming Conventions

## Overview

This document defines the API naming conventions, URL patterns, request/response formats, and best practices for the Sports Academy Management System. All APIs follow RESTful principles with consistent structure and naming.

## Base URL Structure

### API Versioning

All APIs use URL path versioning:

- **Base URL**: `/api/v1/`
- **Platform APIs**: `/api/v1/platform/{resource}/`
- **Tenant APIs**: `/api/v1/tenant/{resource}/`

### URL Pattern Examples

```
/api/v1/platform/academies/              # List/Create academies
/api/v1/platform/academies/{id}/          # Retrieve/Update/Delete academy
/api/v1/platform/subscriptions/           # List/Create subscriptions
/api/v1/platform/subscriptions/{id}/      # Retrieve/Update subscription

/api/v1/tenant/students/                  # List/Create students
/api/v1/tenant/students/{id}/             # Retrieve/Update/Delete student
/api/v1/tenant/classes/                   # List/Create classes
/api/v1/tenant/classes/{id}/              # Retrieve/Update/Delete class
```

## Resource Naming

### Rules

1. **Plural Nouns**: All resource names are plural (e.g., `students`, `classes`, `coaches`)
2. **Lowercase**: All resource names are lowercase
3. **Hyphens for Multi-word**: Use hyphens for multi-word resources (e.g., `age-categories`, `pricing-items`)
4. **No Abbreviations**: Use full words (e.g., `students` not `studs`)
5. **Consistent Naming**: Match model names where applicable

### Resource Examples

```
# Platform Resources
academies
subscriptions
plans
quotas
tenant-usages
analytics

# Tenant Resources
students
coaches
classes
enrollments
attendance
invoices
payments
media-files
locations
sports
age-categories
terms
pricing-items
reports
onboarding
```

## HTTP Methods

### Standard REST Methods

| Method | Purpose | Idempotent | Safe |
|--------|---------|------------|------|
| `GET` | Retrieve resource(s) | Yes | Yes |
| `POST` | Create new resource | No | No |
| `PUT` | Full update (replace) | Yes | No |
| `PATCH` | Partial update | Yes | No |
| `DELETE` | Delete resource | Yes | No |

### Usage Guidelines

- **GET**: List or retrieve resources
- **POST**: Create new resources, trigger actions
- **PUT**: Full resource replacement (rarely used)
- **PATCH**: Partial updates (preferred for updates)
- **DELETE**: Delete resources

### Action Endpoints

For non-CRUD operations, use POST with action suffix:

```
POST /api/v1/tenant/classes/{id}/enroll/      # Enroll student
POST /api/v1/tenant/attendance/{id}/mark/     # Mark attendance
POST /api/v1/tenant/invoices/{id}/send/       # Send invoice
POST /api/v1/platform/academies/{id}/activate/ # Activate academy
```

## Request Format

### Headers

All requests must include:

```
Content-Type: application/json
Authorization: Bearer {jwt_token}
```

### Query Parameters

#### Pagination

```
?page=1&page_size=20
```

#### Filtering

```
?status=active&sport_id=1
?created_after=2024-01-01&created_before=2024-12-31
```

#### Ordering

```
?ordering=name                    # Ascending
?ordering=-created_at            # Descending
?ordering=name,-created_at       # Multiple fields
```

#### Search

```
?search=john                     # Full-text search
```

### Request Body

JSON format for POST/PUT/PATCH:

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "age": 25
}
```

## Response Format

### Success Responses

#### List Response (GET collection)

```json
{
  "count": 100,
  "next": "http://api.example.com/api/v1/tenant/students/?page=2",
  "previous": null,
  "results": [
    {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

#### Detail Response (GET single)

```json
{
  "id": 1,
  "name": "John Doe",
  "email": "john@example.com",
  "age": 25,
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

#### Create Response (POST)

```json
{
  "id": 1,
  "name": "John Doe",
  "email": "john@example.com",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

#### Update Response (PATCH/PUT)

```json
{
  "id": 1,
  "name": "John Doe Updated",
  "email": "john@example.com",
  "updated_at": "2024-01-15T11:00:00Z"
}
```

#### Delete Response (DELETE)

```json
{
  "detail": "Resource deleted successfully"
}
```

### Error Responses

#### Validation Error (400)

```json
{
  "errors": {
    "name": ["This field is required."],
    "email": ["Enter a valid email address."]
  }
}
```

#### Authentication Error (401)

```json
{
  "detail": "Authentication credentials were not provided."
}
```

#### Permission Error (403)

```json
{
  "detail": "You do not have permission to perform this action."
}
```

#### Not Found Error (404)

```json
{
  "detail": "Not found."
}
```

#### Quota Exceeded Error (403)

```json
{
  "detail": "Quota exceeded",
  "quota_type": "students",
  "current_usage": 100,
  "limit": 100
}
```

#### Onboarding Incomplete Error (403)

```json
{
  "detail": "Onboarding not completed",
  "required_steps": [
    "profile",
    "location",
    "sport"
  ]
}
```

#### Server Error (500)

```json
{
  "detail": "An error occurred processing your request."
}
```

## Status Codes

### Standard HTTP Status Codes

| Code | Meaning | Usage |
|------|---------|-------|
| 200 | OK | Successful GET, PUT, PATCH |
| 201 | Created | Successful POST (resource created) |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Validation errors, malformed request |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Insufficient permissions, quota exceeded |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Resource conflict (e.g., duplicate email) |
| 422 | Unprocessable Entity | Business logic validation errors |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |

## Endpoint Examples

### Platform Endpoints

#### List Academies

```
GET /api/v1/platform/academies/
```

Response:
```json
{
  "count": 10,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "name": "Elite Sports Academy",
      "slug": "elite-sports-academy",
      "status": "active",
      "onboarding_completed": true,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### Create Academy

```
POST /api/v1/platform/academies/
```

Request:
```json
{
  "name": "New Sports Academy",
  "slug": "new-sports-academy",
  "owner_email": "owner@example.com"
}
```

#### Get Academy Details

```
GET /api/v1/platform/academies/{id}/
```

#### Update Academy

```
PATCH /api/v1/platform/academies/{id}/
```

Request:
```json
{
  "status": "suspended"
}
```

#### List Subscriptions

```
GET /api/v1/platform/subscriptions/?academy_id=1
```

### Tenant Endpoints

#### List Students

```
GET /api/v1/tenant/students/?page=1&page_size=20&search=john
```

#### Create Student

```
POST /api/v1/tenant/students/
```

Request:
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "date_of_birth": "2010-05-15",
  "parent_id": 1
}
```

#### Get Student Details

```
GET /api/v1/tenant/students/{id}/
```

#### Update Student

```
PATCH /api/v1/tenant/students/{id}/
```

Request:
```json
{
  "name": "John Doe Updated"
}
```

#### Delete Student

```
DELETE /api/v1/tenant/students/{id}/
```

#### Enroll Student in Class

```
POST /api/v1/tenant/classes/{class_id}/enroll/
```

Request:
```json
{
  "student_id": 1
}
```

#### Mark Attendance

```
POST /api/v1/tenant/attendance/mark/
```

Request:
```json
{
  "class_id": 1,
  "student_id": 1,
  "status": "present",
  "date": "2024-01-15"
}
```

#### Upload Media

```
POST /api/v1/tenant/media/upload/
Content-Type: multipart/form-data

file: <binary>
description: "Student photo"
```

## Filtering and Search

### Filter Syntax

Use query parameters for filtering:

```
GET /api/v1/tenant/students/?status=active&sport_id=1
GET /api/v1/tenant/classes/?coach_id=5&location_id=2
GET /api/v1/tenant/attendance/?date=2024-01-15&status=absent
```

### Date Range Filtering

```
GET /api/v1/tenant/students/?created_after=2024-01-01&created_before=2024-12-31
```

### Search

Full-text search across relevant fields:

```
GET /api/v1/tenant/students/?search=john
```

### Related Resource Filtering

Filter by related resources:

```
GET /api/v1/tenant/classes/?sport_id=1&age_category_id=2
```

## Pagination

### Default Pagination

- **Page Size**: 20 items per page (configurable)
- **Max Page Size**: 100 items per page

### Pagination Parameters

```
?page=1                    # Page number (1-indexed)
?page_size=50              # Items per page
```

### Pagination Response

```json
{
  "count": 150,
  "next": "http://api.example.com/api/v1/tenant/students/?page=3",
  "previous": "http://api.example.com/api/v1/tenant/students/?page=1",
  "results": [...]
}
```

## Ordering

### Ordering Syntax

```
?ordering=name             # Ascending
?ordering=-created_at      # Descending
?ordering=name,-created_at # Multiple fields
```

### Default Ordering

Resources have default ordering (usually `-created_at` or `name`).

## Nested Resources

### When to Use Nested Resources

Use nested resources for resources that only exist within a parent:

```
GET /api/v1/tenant/classes/{class_id}/enrollments/
POST /api/v1/tenant/classes/{class_id}/enrollments/
GET /api/v1/tenant/classes/{class_id}/enrollments/{id}/
```

### When NOT to Use Nested Resources

For resources that can exist independently, use flat structure:

```
# Good
GET /api/v1/tenant/students/
GET /api/v1/tenant/classes/

# Avoid
GET /api/v1/tenant/students/{id}/classes/  # Classes are independent
```

## Bulk Operations

### Bulk Create

```
POST /api/v1/tenant/students/bulk/
```

Request:
```json
{
  "students": [
    {"name": "John Doe", "email": "john@example.com"},
    {"name": "Jane Smith", "email": "jane@example.com"}
  ]
}
```

### Bulk Update

```
PATCH /api/v1/tenant/students/bulk/
```

Request:
```json
{
  "ids": [1, 2, 3],
  "updates": {
    "status": "inactive"
  }
}
```

### Bulk Delete

```
DELETE /api/v1/tenant/students/bulk/
```

Request:
```json
{
  "ids": [1, 2, 3]
}
```

## File Upload Endpoints

### Single File Upload

```
POST /api/v1/tenant/media/upload/
Content-Type: multipart/form-data

file: <binary>
description: "Optional description"
```

Response:
```json
{
  "id": 1,
  "file_url": "https://storage.example.com/media/file.jpg",
  "file_size": 1024000,
  "mime_type": "image/jpeg",
  "description": "Student photo",
  "created_at": "2024-01-15T10:30:00Z"
}
```

### Multiple File Upload

```
POST /api/v1/tenant/media/upload-multiple/
Content-Type: multipart/form-data

files: [<binary>, <binary>]
```

## Authentication

### JWT Token Format

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Token Claims

JWT token includes:
- `user_id`: User ID
- `academy_id`: Academy ID (for tenant users)
- `role`: User role (SUPERADMIN, OWNER, ADMIN, COACH, PARENT)
- `exp`: Expiration timestamp
- `iat`: Issued at timestamp

### Token Refresh

```
POST /api/v1/auth/refresh/
```

Request:
```json
{
  "refresh_token": "refresh_token_here"
}
```

## Rate Limiting

### Rate Limit Headers

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

### Rate Limit Response (429)

```json
{
  "detail": "Request was throttled. Expected available in 60 seconds."
}
```

## API Documentation

### OpenAPI/Swagger

API documentation available at:
- Swagger UI: `/api/docs/`
- ReDoc: `/api/redoc/`
- OpenAPI Schema: `/api/schema/`

### Documentation Standards

- All endpoints must be documented
- Include request/response examples
- Document all query parameters
- Document error responses
- Include authentication requirements

## Best Practices

1. **Consistent Naming**: Use consistent resource names across all endpoints
2. **RESTful Design**: Follow REST principles strictly
3. **Versioning**: Always include version in URL path
4. **Error Handling**: Return consistent error formats
5. **Pagination**: Always paginate list endpoints
6. **Filtering**: Provide filtering options for list endpoints
7. **Validation**: Validate all inputs at serializer level
8. **Permissions**: Check permissions on every endpoint
9. **Logging**: Log all API requests and errors
10. **Documentation**: Keep API documentation up to date

## Google Cloud Considerations

### API Gateway

- Use Cloud Endpoints or API Gateway for API management
- Configure rate limiting and authentication
- Enable request/response logging
- Set up monitoring and alerts

### CORS Configuration

Configure CORS for frontend domain:

```python
CORS_ALLOWED_ORIGINS = [
    "https://app.example.com",
    "https://admin.example.com",
]
```

### Load Balancing

- Use Cloud Load Balancing for high availability
- Configure health checks
- Set up SSL/TLS termination

### Monitoring

- Use Cloud Monitoring for API metrics
- Track request rates, error rates, latency
- Set up alerts for anomalies
