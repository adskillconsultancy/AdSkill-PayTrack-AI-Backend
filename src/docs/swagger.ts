export const swaggerDocument = {
  openapi: '3.0.3',
  info: {
    title: 'AdSkill PayTrack AI - Backend API',
    version: '1.0.0',
    description:
      'Official REST API documentation for the AdSkill Client Payment Tracker system. Supports client accounts, payment plans, installment schedules, invoices, and audit tracking.',
    contact: {
      name: 'AdSkill Engineering Team',
      email: 'support@adskill.com',
    },
  },
  servers: [
    {
      url: '/api/v1',
      description: 'Current API Server (v1)',
    },
    {
      url: 'http://localhost:5000/api/v1',
      description: 'Local Development Server',
    },
  ],
  tags: [
    {
      name: 'Health',
      description: 'System health check and uptime monitor',
    },
    {
      name: 'Users',
      description: 'Staff and client account management',
    },
    {
      name: 'Auth',
      description: 'Authentication, JWT token lifecycle, and MFA',
    },
    {
      name: 'Clients',
      description: 'Client profiles, case details, and assigned consultants',
    },
    {
      name: 'Payment Plans',
      description: 'Contracted fees, schedules, and installment management',
    },
    {
      name: 'Payments',
      description: 'Payment records, Stripe checkout, manual entries, and receipts',
    },
    {
      name: 'Invoices',
      description: 'Branded PDF invoices, numbering policy, and statements',
    },
    {
      name: 'Audit Logs',
      description: 'Immutable financial and security activity trail',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Provide JWT token in format: Bearer <token>',
      },
    },
    schemas: {
      UserRole: {
        type: 'string',
        enum: ['SUPER_ADMIN', 'FINANCE_MANAGER', 'CASE_MANAGER', 'CLIENT'],
      },
      UserStatus: {
        type: 'string',
        enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'],
      },
      User: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            example: 'c64a3a97-9e48-4384-9a57-0130d2d31c4f',
          },
          name: {
            type: 'string',
            example: 'M. Abir Alam',
          },
          email: {
            type: 'string',
            format: 'email',
            example: 'abir@adskill.com',
          },
          phone: {
            type: 'string',
            nullable: true,
            example: '+1-416-555-0199',
          },
          role: {
            $ref: '#/components/schemas/UserRole',
          },
          status: {
            $ref: '#/components/schemas/UserStatus',
          },
          isMfaEnabled: {
            type: 'boolean',
            example: false,
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            example: '2026-09-08T18:00:00.000Z',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            example: '2026-09-08T18:00:00.000Z',
          },
        },
      },
      CreateUserRequest: {
        type: 'object',
        required: ['name', 'email', 'password'],
        properties: {
          name: {
            type: 'string',
            example: 'John Doe',
          },
          email: {
            type: 'string',
            format: 'email',
            example: 'john.doe@example.com',
          },
          password: {
            type: 'string',
            format: 'password',
            minLength: 6,
            example: 'SecurePassword123!',
          },
          phone: {
            type: 'string',
            example: '+1-416-555-0123',
          },
          role: {
            $ref: '#/components/schemas/UserRole',
            default: 'CLIENT',
          },
          status: {
            $ref: '#/components/schemas/UserStatus',
            default: 'ACTIVE',
          },
        },
      },
      UpdateUserRequest: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            example: 'Johnathan Doe',
          },
          password: {
            type: 'string',
            format: 'password',
            minLength: 6,
            example: 'NewSecurePassword123!',
          },
          phone: {
            type: 'string',
            example: '+1-416-555-9876',
          },
          role: {
            $ref: '#/components/schemas/UserRole',
          },
          status: {
            $ref: '#/components/schemas/UserStatus',
          },
        },
      },
      ErrorSource: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            example: 'email',
          },
          message: {
            type: 'string',
            example: 'Invalid email address format',
          },
        },
      },
      ApiErrorResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: false,
          },
          message: {
            type: 'string',
            example: 'Validation Error',
          },
          errorSources: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/ErrorSource',
            },
          },
          stack: {
            type: 'string',
            nullable: true,
            example: null,
          },
        },
      },
      PaginationMeta: {
        type: 'object',
        properties: {
          page: {
            type: 'integer',
            example: 1,
          },
          limit: {
            type: 'integer',
            example: 10,
          },
          total: {
            type: 'integer',
            example: 45,
          },
          totalPage: {
            type: 'integer',
            example: 5,
          },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Check API server health status',
        description: 'Returns the current server health, system timestamp, and runtime uptime.',
        responses: {
          '200': {
            description: 'Server is healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: {
                      type: 'string',
                      example: 'AdSkill PayTrack AI API is running smoothly',
                    },
                    data: {
                      type: 'object',
                      properties: {
                        status: { type: 'string', example: 'healthy' },
                        timestamp: {
                          type: 'string',
                          example: '2026-09-08T18:36:18.205Z',
                        },
                        uptime: { type: 'number', example: 124.5 },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/users': {
      post: {
        tags: ['Users'],
        summary: 'Create a new user account',
        description: 'Creates a new user profile with password hashing and schema validation.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/CreateUserRequest',
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'User created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: {
                      type: 'string',
                      example: 'User created successfully',
                    },
                    data: {
                      $ref: '#/components/schemas/User',
                    },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Validation error',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ApiErrorResponse',
                },
              },
            },
          },
          '409': {
            description: 'Duplicate email conflict',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ApiErrorResponse',
                },
              },
            },
          },
        },
      },
      get: {
        tags: ['Users'],
        summary: 'Get paginated list of users',
        description: 'Filter and search through users. Requires SUPER_ADMIN or FINANCE_MANAGER authentication.',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'searchTerm',
            in: 'query',
            description: 'Partial search matching name, email, or phone',
            required: false,
            schema: { type: 'string' },
          },
          {
            name: 'role',
            in: 'query',
            description: 'Filter by user role',
            required: false,
            schema: { $ref: '#/components/schemas/UserRole' },
          },
          {
            name: 'status',
            in: 'query',
            description: 'Filter by account status',
            required: false,
            schema: { $ref: '#/components/schemas/UserStatus' },
          },
          {
            name: 'page',
            in: 'query',
            description: 'Page number (default: 1)',
            required: false,
            schema: { type: 'integer', default: 1 },
          },
          {
            name: 'limit',
            in: 'query',
            description: 'Items per page (default: 10)',
            required: false,
            schema: { type: 'integer', default: 10 },
          },
          {
            name: 'sortBy',
            in: 'query',
            description: 'Sort field name (default: createdAt)',
            required: false,
            schema: { type: 'string', default: 'createdAt' },
          },
          {
            name: 'sortOrder',
            in: 'query',
            description: 'Sort direction (asc or desc, default: desc)',
            required: false,
            schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
          },
        ],
        responses: {
          '200': {
            description: 'Users retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: {
                      type: 'string',
                      example: 'Users retrieved successfully',
                    },
                    meta: {
                      $ref: '#/components/schemas/PaginationMeta',
                    },
                    data: {
                      type: 'array',
                      items: {
                        $ref: '#/components/schemas/User',
                      },
                    },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Unauthorized (Missing or invalid token)',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiErrorResponse' },
              },
            },
          },
          '403': {
            description: 'Forbidden (Insufficient role permissions)',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/users/{id}': {
      get: {
        tags: ['Users'],
        summary: 'Get single user by ID',
        description: 'Retrieves user details by unique identifier.',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'User UUID',
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          '200': {
            description: 'User retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: {
                      type: 'string',
                      example: 'User retrieved successfully',
                    },
                    data: {
                      $ref: '#/components/schemas/User',
                    },
                  },
                },
              },
            },
          },
          '404': {
            description: 'User not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiErrorResponse' },
              },
            },
          },
        },
      },
      patch: {
        tags: ['Users'],
        summary: 'Update user by ID',
        description: 'Updates specified fields for an existing user account.',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'User UUID',
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/UpdateUserRequest',
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'User updated successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: {
                      type: 'string',
                      example: 'User updated successfully',
                    },
                    data: {
                      $ref: '#/components/schemas/User',
                    },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Validation error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiErrorResponse' },
              },
            },
          },
          '404': {
            description: 'User not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiErrorResponse' },
              },
            },
          },
        },
      },
      delete: {
        tags: ['Users'],
        summary: 'Delete user by ID',
        description: 'Permanently removes a user record. Requires SUPER_ADMIN privileges.',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'User UUID',
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          '200': {
            description: 'User deleted successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: {
                      type: 'string',
                      example: 'User deleted successfully',
                    },
                    data: {
                      $ref: '#/components/schemas/User',
                    },
                  },
                },
              },
            },
          },
          '404': {
            description: 'User not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiErrorResponse' },
              },
            },
          },
        },
      },
    },
  },
};
