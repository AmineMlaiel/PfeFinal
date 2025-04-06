# Backend API

This is the backend API for the HR Project application. It provides user authentication, profile management, and administrative features.

## Technologies Used

- Node.js
- Express
- MongoDB with Mongoose
- JSON Web Tokens (JWT) for authentication
- Nodemailer for email notifications

## Project Structure

```
backend/
├── config/          - Configuration files
├── controllers/     - Request handlers
├── middleware/      - Express middleware
├── models/          - MongoDB models
├── routes/          - API routes
├── utils/           - Utility functions
├── .env             - Environment variables
├── package.json     - Dependencies
└── server.js        - Application entry point
```

## Setup Instructions

1. Install dependencies:

   ```
   npm install
   ```

2. Create a `.env` file in the root directory with the following variables:

   ```
   # MongoDB
   MONGO_URI=mongodb://localhost:27017/HRProject

   # Server
   PORT=3900

   # JWT
   JWT_SECRET=your_jwt_secret
   JWT_EXPIRES_IN=3d

   # NodeMailer
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=your_app_password

   # Frontend URL
   FRONTEND_URL=http://localhost:4200
   ```

3. Start the development server:
   ```
   npm run dev
   ```

## API Endpoints

### Public Routes

- `POST /api/users/register` - Register a new user
- `POST /api/users/login` - Login user
- `GET /api/users/confirm-email` - Confirm user email
- `POST /api/users/forgot-password` - Request password reset
- `POST /api/users/reset-password` - Reset password with token

### Protected Routes (requires authentication)

- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `DELETE /api/users/profile` - Delete user profile

### Admin Routes (requires admin role)

- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user by ID
- `DELETE /api/users/:id` - Delete user by ID
- `PUT /api/users/:id/validate` - Validate user by ID
