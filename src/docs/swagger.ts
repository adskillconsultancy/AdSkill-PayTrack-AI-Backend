export const swaggerDocument = {
  openapi: "3.0.3",
  info: {
    title: "AdSkill PayTrack AI - Backend API",
    version: "1.0.0",
    description:
      "Official REST API documentation for the AdSkill Client Payment Tracker system. Supports client accounts, payment plans, installment schedules, invoices, and audit tracking.",
    contact: {
      name: "AdSkill Engineering Team",
      email: "support@adskill.com",
    },
  },
  servers: [
    {
      url: "/api/v1",
      description: "Current API Server (v1)",
    },
    {
      url: "http://localhost:5000/api/v1",
      description: "Local Development Server",
    },
  ],
  tags: [
    {
      name: "Health",
      description: "System health check and uptime monitor",
    },
    {
      name: "Users",
      description: "Staff and client account management",
    },
    {
      name: "Auth",
      description: "Authentication, JWT token lifecycle, and MFA",
    },
    {
      name: "Clients",
      description: "Client profiles, case details, and assigned consultants",
    },
    {
      name: "Payment Plans",
      description: "Contracted fees, schedules, and installment management",
    },
    {
      name: "Payments",
      description:
        "Payment records, Stripe checkout, manual entries, and receipts",
    },
    {
      name: "Invoices",
      description: "Branded PDF invoices, numbering policy, and statements",
    },
    {
      name: "Audit Logs",
      description: "Immutable financial and security activity trail",
    },
    {
      name: "Roles & Permissions",
      description: "PBAC dynamic role management and granular capability assignment",
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Provide JWT token in format: Bearer <token>",
      },
    },
    schemas: {
      UserRole: {
        type: "string",
        enum: ["SUPER_ADMIN", "MANAGER", "CONSULTANT", "CLIENT"],
      },
      UserStatus: {
        type: "string",
        enum: ["ACTIVE", "INACTIVE", "SUSPENDED"],
      },
      User: {
        type: "object",
        properties: {
          id: {
            type: "string",
            format: "uuid",
            example: "c64a3a97-9e48-4384-9a57-0130d2d31c4f",
          },
          name: {
            type: "string",
            example: "M. Abir Alam",
          },
          email: {
            type: "string",
            format: "email",
            example: "abir@adskill.com",
          },
          phone: {
            type: "string",
            nullable: true,
            example: "+1-416-555-0199",
          },
          whatsapp: {
            type: "string",
            nullable: true,
            example: "+1-416-555-0199",
          },
          address: {
            type: "string",
            nullable: true,
            example: "100 King St W, Suite 5600, Toronto, ON",
          },
          clientId: {
            type: "string",
            nullable: true,
            example: "ASK-2026-0001",
          },
          isDeleted: {
            type: "boolean",
            example: false,
          },
          role: {
            $ref: "#/components/schemas/UserRole",
          },
          status: {
            $ref: "#/components/schemas/UserStatus",
          },
          isMfaEnabled: {
            type: "boolean",
            example: false,
          },
          createdAt: {
            type: "string",
            format: "date-time",
            example: "2026-09-08T18:00:00.000Z",
          },
          updatedAt: {
            type: "string",
            format: "date-time",
            example: "2026-09-08T18:00:00.000Z",
          },
        },
      },
      CreateUserRequest: {
        type: "object",
        required: ["name", "email", "password"],
        properties: {
          name: {
            type: "string",
            example: "John Doe",
          },
          email: {
            type: "string",
            format: "email",
            example: "john.doe@example.com",
          },
          password: {
            type: "string",
            format: "password",
            minLength: 6,
            example: "SecurePassword123!",
          },
          phone: {
            type: "string",
            example: "+1-416-555-0123",
          },
          role: {
            $ref: "#/components/schemas/UserRole",
            default: "CLIENT",
          },
          status: {
            $ref: "#/components/schemas/UserStatus",
            default: "ACTIVE",
          },
        },
      },
      UpdateUserRequest: {
        type: "object",
        properties: {
          name: {
            type: "string",
            example: "Johnathan Doe",
          },
          password: {
            type: "string",
            format: "password",
            minLength: 6,
            example: "NewSecurePassword123!",
          },
          phone: {
            type: "string",
            example: "+1-416-555-9876",
          },
          role: {
            $ref: "#/components/schemas/UserRole",
          },
          status: {
            $ref: "#/components/schemas/UserStatus",
          },
        },
      },
      ErrorSource: {
        type: "object",
        properties: {
          path: {
            type: "string",
            example: "email",
          },
          message: {
            type: "string",
            example: "Invalid email address format",
          },
        },
      },
      ApiErrorResponse: {
        type: "object",
        properties: {
          success: {
            type: "boolean",
            example: false,
          },
          message: {
            type: "string",
            example: "Validation Error",
          },
          errorSources: {
            type: "array",
            items: {
              $ref: "#/components/schemas/ErrorSource",
            },
          },
          stack: {
            type: "string",
            nullable: true,
            example: null,
          },
        },
      },
      PaginationMeta: {
        type: "object",
        properties: {
          page: {
            type: "integer",
            example: 1,
          },
          limit: {
            type: "integer",
            example: 10,
          },
          total: {
            type: "integer",
            example: 45,
          },
          totalPage: {
            type: "integer",
            example: 5,
          },
        },
      },
      RegisterRequest: {
        type: "object",
        required: ["name", "email", "password"],
        properties: {
          name: { type: "string", example: "Sarah Jenkins" },
          preferredName: { type: "string", example: "Sarah" },
          email: {
            type: "string",
            format: "email",
            example: "sarah.jenkins@example.com",
          },
          password: {
            type: "string",
            format: "password",
            minLength: 6,
            example: "SecurePassword123!",
          },
          phone: { type: "string", example: "+1-416-555-0199" },
          whatsapp: { type: "string", example: "+1-416-555-0199" },
          address: {
            type: "string",
            example: "100 King St W, Suite 5600, Toronto, ON",
          },
          city: { type: "string", example: "Toronto" },
          state: { type: "string", example: "ON" },
          postalCode: { type: "string", example: "M5X 1C9" },
          country: { type: "string", example: "Canada" },
        },
      },
      LoginRequest: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: {
            type: "string",
            format: "email",
            example: "sarah.jenkins@example.com",
          },
          password: {
            type: "string",
            format: "password",
            example: "SecurePassword123!",
          },
        },
      },
      ServiceCategory: {
        type: "string",
        enum: ["IMMIGRATION", "BUSINESS", "CONSULTATION", "DMV_PSB", "CUSTOM"],
      },
      Service: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string", example: "EB-2 NIW - National Interest Waiver" },
          code: { type: "string", example: "EB2-NIW" },
          category: { $ref: "#/components/schemas/ServiceCategory" },
          description: { type: "string", nullable: true, example: "Self-petitioned employment-based green card" },
          baseFee: { type: "number", example: 5000.0 },
          estimatedGovFee: { type: "number", example: 1015.0 },
          estimatedAttorneyFee: { type: "number", example: 1500.0 },
          estimatedThirdPartyFee: { type: "number", example: 500.0 },
          totalEstimatedCost: { type: "number", example: 8015.0 },
          currency: { type: "string", example: "USD" },
          defaultDeposit: { type: "number", nullable: true, example: 1500.0 },
          defaultInstallments: { type: "integer", nullable: true, example: 4 },
          estimatedDuration: { type: "string", nullable: true, example: "6-9 months" },
          isActive: { type: "boolean", example: true },
          createdById: { type: "string", format: "uuid" },
          createdBy: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              name: { type: "string" },
              email: { type: "string" },
            },
          },
          updatedById: { type: "string", format: "uuid", nullable: true },
          isDeleted: { type: "boolean", example: false },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      CreateServiceRequest: {
        type: "object",
        required: ["name", "code", "baseFee"],
        properties: {
          name: { type: "string", example: "EB-2 NIW - National Interest Waiver" },
          code: { type: "string", example: "EB2-NIW" },
          category: { $ref: "#/components/schemas/ServiceCategory", default: "IMMIGRATION" },
          description: { type: "string", example: "Comprehensive NIW petition package" },
          baseFee: { type: "number", example: 5000.0 },
          estimatedGovFee: { type: "number", default: 0.0, example: 1015.0 },
          estimatedAttorneyFee: { type: "number", default: 0.0, example: 1500.0 },
          estimatedThirdPartyFee: { type: "number", default: 0.0, example: 500.0 },
          currency: { type: "string", default: "USD", example: "USD" },
          defaultDeposit: { type: "number", example: 1500.0 },
          defaultInstallments: { type: "integer", example: 4 },
          estimatedDuration: { type: "string", example: "6-9 months" },
          isActive: { type: "boolean", default: true },
        },
      },
      UpdateServiceRequest: {
        type: "object",
        properties: {
          name: { type: "string" },
          code: { type: "string" },
          category: { $ref: "#/components/schemas/ServiceCategory" },
          description: { type: "string" },
          baseFee: { type: "number" },
          estimatedGovFee: { type: "number" },
          estimatedAttorneyFee: { type: "number" },
          estimatedThirdPartyFee: { type: "number" },
          currency: { type: "string" },
          defaultDeposit: { type: "number" },
          defaultInstallments: { type: "integer" },
          estimatedDuration: { type: "string" },
          isActive: { type: "boolean" },
          isDeleted: { type: "boolean" },
        },
      },
    },
  },
  paths: {
    "/auth/register": {
      post: {
        tags: ["Authentication"],
        summary: "Public client self-registration",
        description:
          "Enrolls a new client into AdSkill PayTrack. Automatically sets role to CLIENT and issues a unique Client ID (ASK-YYYY-XXXX).",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RegisterRequest" },
            },
          },
        },
        responses: {
          "201": {
            description: "Client registered successfully",
          },
          "409": {
            description: "Email already in use",
          },
        },
      },
    },
    "/auth/login": {
      post: {
        tags: ["Authentication"],
        summary: "User login",
        description:
          "Authenticates user with email and password, returning JWT access token and setting HTTP-only refresh token cookie.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/LoginRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Login successful",
          },
          "401": {
            description: "Invalid email or password",
          },
        },
      },
    },
    "/auth/refresh-token": {
      post: {
        tags: ["Authentication"],
        summary: "Refresh access token",
        description:
          "Generates a new access token using the HTTP-only refresh token cookie.",
        responses: {
          "200": {
            description: "Access token refreshed successfully",
          },
          "401": {
            description: "Invalid or missing refresh token",
          },
        },
      },
    },
    "/auth/me": {
      get: {
        tags: ["Authentication"],
        summary: "Get current authenticated user profile",
        description:
          "Returns profile, dynamic role, and assigned permissions for the currently logged-in user.",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Profile fetched successfully",
          },
          "401": {
            description: "Unauthorized",
          },
        },
      },
    },
    "/health": {
      get: {
        tags: ["Health"],
        summary: "Check API server health status",
        description:
          "Returns the current server health, system timestamp, and runtime uptime.",
        responses: {
          "200": {
            description: "Server is healthy",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: {
                      type: "string",
                      example: "AdSkill PayTrack AI API is running smoothly",
                    },
                    data: {
                      type: "object",
                      properties: {
                        status: { type: "string", example: "healthy" },
                        timestamp: {
                          type: "string",
                          example: "2026-09-08T18:36:18.205Z",
                        },
                        uptime: { type: "number", example: 124.5 },
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
    "/users": {
      post: {
        tags: ["Users"],
        summary: "Create a new user account",
        description:
          "Creates a new user profile with password hashing and schema validation.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/CreateUserRequest",
              },
            },
          },
        },
        responses: {
          "201": {
            description: "User created successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: {
                      type: "string",
                      example: "User created successfully",
                    },
                    data: {
                      $ref: "#/components/schemas/User",
                    },
                  },
                },
              },
            },
          },
          "400": {
            description: "Validation error",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ApiErrorResponse",
                },
              },
            },
          },
          "409": {
            description: "Duplicate email conflict",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ApiErrorResponse",
                },
              },
            },
          },
        },
      },
      get: {
        tags: ["Users"],
        summary: "Get paginated list of users",
        description:
          "Filter and search through users. Requires SUPER_ADMIN or MANAGER authentication.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "searchTerm",
            in: "query",
            description: "Partial search matching name, email, or phone",
            required: false,
            schema: { type: "string" },
          },
          {
            name: "role",
            in: "query",
            description: "Filter by user role",
            required: false,
            schema: { $ref: "#/components/schemas/UserRole" },
          },
          {
            name: "status",
            in: "query",
            description: "Filter by account status",
            required: false,
            schema: { $ref: "#/components/schemas/UserStatus" },
          },
          {
            name: "page",
            in: "query",
            description: "Page number (default: 1)",
            required: false,
            schema: { type: "integer", default: 1 },
          },
          {
            name: "limit",
            in: "query",
            description: "Items per page (default: 10)",
            required: false,
            schema: { type: "integer", default: 10 },
          },
          {
            name: "sortBy",
            in: "query",
            description: "Sort field name (default: createdAt)",
            required: false,
            schema: { type: "string", default: "createdAt" },
          },
          {
            name: "sortOrder",
            in: "query",
            description: "Sort direction (asc or desc, default: desc)",
            required: false,
            schema: { type: "string", enum: ["asc", "desc"], default: "desc" },
          },
        ],
        responses: {
          "200": {
            description: "Users retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: {
                      type: "string",
                      example: "Users retrieved successfully",
                    },
                    meta: {
                      $ref: "#/components/schemas/PaginationMeta",
                    },
                    data: {
                      type: "array",
                      items: {
                        $ref: "#/components/schemas/User",
                      },
                    },
                  },
                },
              },
            },
          },
          "401": {
            description: "Unauthorized (Missing or invalid token)",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiErrorResponse" },
              },
            },
          },
          "403": {
            description: "Forbidden (Insufficient role permissions)",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/users/{id}": {
      get: {
        tags: ["Users"],
        summary: "Get single user by ID",
        description: "Retrieves user details by unique identifier.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            description: "User UUID",
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          "200": {
            description: "User retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: {
                      type: "string",
                      example: "User retrieved successfully",
                    },
                    data: {
                      $ref: "#/components/schemas/User",
                    },
                  },
                },
              },
            },
          },
          "404": {
            description: "User not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiErrorResponse" },
              },
            },
          },
        },
      },
      patch: {
        tags: ["Users"],
        summary: "Update user by ID",
        description: "Updates specified fields for an existing user account.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            description: "User UUID",
            schema: { type: "string", format: "uuid" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/UpdateUserRequest",
              },
            },
          },
        },
        responses: {
          "200": {
            description: "User updated successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: {
                      type: "string",
                      example: "User updated successfully",
                    },
                    data: {
                      $ref: "#/components/schemas/User",
                    },
                  },
                },
              },
            },
          },
          "400": {
            description: "Validation error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiErrorResponse" },
              },
            },
          },
          "404": {
            description: "User not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiErrorResponse" },
              },
            },
          },
        },
      },
      delete: {
        tags: ["Users"],
        summary: "Delete user by ID",
        description:
          "Permanently removes a user record. Requires SUPER_ADMIN privileges.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            description: "User UUID",
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          "200": {
            description: "User deleted successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: {
                      type: "string",
                      example: "User deleted successfully",
                    },
                    data: {
                      $ref: "#/components/schemas/User",
                    },
                  },
                },
              },
            },
          },
          "404": {
            description: "User not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/users/{id}/permissions": {
      get: {
        tags: ["Users"],
        summary: "Get effective capabilities for an individual user",
        description: "Returns role-inherited permissions, direct capability overrides, and effective capabilities. Requires 'user:manage-role'.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          "200": {
            description: "User effective permissions retrieved successfully",
          },
        },
      },
      patch: {
        tags: ["Users"],
        summary: "Assign direct capability overrides to an individual user",
        description: "Enables granular IAM/WordPress-style capability overrides for an individual user without modifying their role. Requires 'user:manage-role'.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["permissionIds"],
                properties: {
                  permissionIds: {
                    type: "array",
                    items: { type: "string", format: "uuid" },
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "User direct permissions updated successfully",
          },
        },
      },
    },
    "/roles/permissions/all": {
      get: {
        tags: ["Roles & Permissions"],
        summary: "Get all system permissions grouped by module",
        description: "Returns full canonical permission matrix for dynamic RBAC checkbox grids. Requires 'user:manage-role' permission.",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Permissions retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Permissions retrieved successfully" },
                    data: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          module: { type: "string", example: "USER" },
                          permissions: {
                            type: "array",
                            items: {
                              type: "object",
                              properties: {
                                id: { type: "string", format: "uuid" },
                                name: { type: "string", example: "user:read" },
                                description: { type: "string", example: "View user profiles and list" },
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
          },
        },
      },
    },
    "/roles": {
      get: {
        tags: ["Roles & Permissions"],
        summary: "Get all user roles with their assigned permissions",
        description: "Returns list of all active roles and their capabilities. Requires 'user:manage-role' permission.",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Roles retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Roles retrieved successfully" },
                    data: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "string", format: "uuid" },
                          name: { type: "string", example: "JR_MANAGER" },
                          userCount: { type: "number", example: 3 },
                          isSystemRole: { type: "boolean", example: false },
                          permissions: {
                            type: "array",
                            items: {
                              type: "object",
                              properties: {
                                id: { type: "string", format: "uuid" },
                                name: { type: "string", example: "user:read" },
                                module: { type: "string", example: "USER" },
                                description: { type: "string", example: "View user profiles" },
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
          },
        },
      },
      post: {
        tags: ["Roles & Permissions"],
        summary: "Create a new dynamic role",
        description: "Creates a new role with optional initial permissions. Requires 'user:manage-role' permission.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name"],
                properties: {
                  name: { type: "string", example: "JR_MANAGER" },
                  permissionIds: {
                    type: "array",
                    items: { type: "string", format: "uuid" },
                  },
                },
              },
            },
          },
        },
        responses: {
          "210": {
            description: "Dynamic role created successfully",
          },
        },
      },
    },
    "/roles/{id}": {
      get: {
        tags: ["Roles & Permissions"],
        summary: "Get single role details by ID",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          "200": { description: "Role details retrieved successfully" },
        },
      },
      delete: {
        tags: ["Roles & Permissions"],
        summary: "Delete custom role",
        description: "Soft deletes custom role. Immutable system roles cannot be deleted. Requires 'user:manage-role'.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          "200": { description: "Role deleted successfully" },
        },
      },
    },
    "/roles/{id}/permissions": {
      patch: {
        tags: ["Roles & Permissions"],
        summary: "Update permissions for a role",
        description: "Synchronizes the exact list of assigned permissions for a role. Requires 'user:manage-role' permission.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["permissionIds"],
                properties: {
                  permissionIds: {
                    type: "array",
                    items: { type: "string", format: "uuid" },
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Role permissions updated successfully" },
        },
      },
    },
    "/services": {
      post: {
        tags: ["Services"],
        summary: "Create a new service offering",
        description:
          "Registers a new advisory or legal service in the catalog with segregated fee components. Requires 'service:manage' permission (Super Admin).",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateServiceRequest" },
            },
          },
        },
        responses: {
          "201": {
            description: "Service offering created successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    statusCode: { type: "integer", example: 201 },
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Service offering created successfully" },
                    data: { $ref: "#/components/schemas/Service" },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "409": { description: "Conflict - Service name or code already exists" },
        },
      },
      get: {
        tags: ["Services"],
        summary: "Retrieve all service catalog offerings",
        description:
          "Fetches a paginated, searchable, and filterable list of active service offerings with fee breakdowns and total cost calculations. Requires 'service:read' permission (Super Admin, Manager, Consultant).",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "searchTerm", in: "query", schema: { type: "string" }, description: "Search by name, code, or description" },
          { name: "category", in: "query", schema: { $ref: "#/components/schemas/ServiceCategory" } },
          { name: "currency", in: "query", schema: { type: "string", example: "USD" } },
          { name: "isActive", in: "query", schema: { type: "boolean" } },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 10 } },
          { name: "sortBy", in: "query", schema: { type: "string", default: "createdAt" } },
          { name: "sortOrder", in: "query", schema: { type: "string", enum: ["asc", "desc"], default: "desc" } },
        ],
        responses: {
          "200": {
            description: "Services retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    statusCode: { type: "integer", example: 200 },
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Services retrieved successfully" },
                    meta: { $ref: "#/components/schemas/PaginationMeta" },
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Service" },
                    },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
        },
      },
    },
    "/services/{id}": {
      get: {
        tags: ["Services"],
        summary: "Retrieve service by ID",
        description: "Fetches details of a single service offering by unique ID. Requires 'service:read' permission.",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        responses: {
          "200": {
            description: "Service retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    statusCode: { type: "integer", example: 200 },
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Service retrieved successfully" },
                    data: { $ref: "#/components/schemas/Service" },
                  },
                },
              },
            },
          },
          "404": { description: "Service not found" },
        },
      },
      patch: {
        tags: ["Services"],
        summary: "Update service details",
        description: "Updates service details, pricing, duration, or active status. Requires 'service:manage' permission.",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateServiceRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Service updated successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    statusCode: { type: "integer", example: 200 },
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Service updated successfully" },
                    data: { $ref: "#/components/schemas/Service" },
                  },
                },
              },
            },
          },
          "404": { description: "Service not found" },
        },
      },
      delete: {
        tags: ["Services"],
        summary: "Soft delete a service",
        description: "Marks a service as deleted. Historical contracts and invoices remain intact. Requires 'service:manage' permission.",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        responses: {
          "200": {
            description: "Service soft deleted successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    statusCode: { type: "integer", example: 200 },
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Service soft deleted successfully" },
                    data: { $ref: "#/components/schemas/Service" },
                  },
                },
              },
            },
          },
          "404": { description: "Service not found" },
        },
      },
    },
  },
};
