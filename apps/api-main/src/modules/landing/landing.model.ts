import { z } from "zod"

export const landingContactBodySchema = z.object({
  clinicName: z.string().min(1, "clinicName is required").max(500),
  phoneNumber: z.string().min(1, "phoneNumber is required").max(50),
})

export type LandingContactBody = z.infer<typeof landingContactBodySchema>
