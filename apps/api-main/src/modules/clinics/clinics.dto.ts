/**
 * Request/response DTO types for clinics module
 */

export interface CreateClinicRequest {
  clinicDisplayName: string
  clinicUniqueName: string
  ownerUserName: string
  ownerDisplayName: string
  ownerPassword: string
  plan?: "starter" | "pro"
}

export interface LoginClinicOwnerRequest {
  username: string
  password: string
}

export interface LoginClinicOwnerResponse {
  token: string
  owner: {
    _id: string
    userName: string
    displayName: string
    role: string
    clinicId: string
    clinicDisplayName: string
  }
  expiresIn: string
}
