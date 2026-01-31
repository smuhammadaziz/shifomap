/**
 * Request/response DTO types for auth module
 * These define the shape of data sent to/from the API
 */

export interface CreateAdminRequest {
  username: string
  displayName: string
  password: string
}

export interface LoginAdminRequest {
  username: string
  password: string
}

export interface CreateAdminResponse {
  _id: string
  username: string
  displayName: string
  status: string
  role: string
  access: { permissions: string[] }
  createdAt: string
  updatedAt: string
}

export interface LoginAdminResponse {
  token: string
  admin: {
    _id: string
    username: string
    displayName: string
    status: string
    role: string
    access: { permissions: string[] }
  }
  expiresIn: string
}
