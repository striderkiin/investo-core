// Single instances of the main app's Supabase-backed services, shared by the
// admin panel so every page talks to the same client and session.
import { getSupabaseClient } from '../../../src/services/supabase/client'
import { createAuthService } from '../../../src/services/auth/authService'
import { createSecurityService } from '../../../src/services/api/securityService'
import { createUserService } from '../../../src/services/api/userService'
import { createBrandingService } from '../../../src/services/api/brandingService'
import { createInvestmentService } from '../../../src/services/api/investmentService'

export const supabase = getSupabaseClient()
export const authService = createAuthService(supabase)
export const securityService = createSecurityService(supabase)
export const userService = createUserService(supabase)
export const brandingService = createBrandingService(supabase)
export const investmentService = createInvestmentService(supabase)
