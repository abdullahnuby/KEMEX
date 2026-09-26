import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "npm:@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

const PLANS = new Set(["trial", "standard", "enterprise"])

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

function errorResponse(code: string, message: string, status: number) {
  return response({ error_code: code, error: message }, status)
}

function getPublishableKey() {
  const raw = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS")
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Record<string, string>
      if (parsed.default) return parsed.default
    } catch { /* legacy fallback */ }
  }
  return Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? ""
}

function getSecretKey() {
  const raw = Deno.env.get("SUPABASE_SECRET_KEYS")
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Record<string, string>
      if (parsed.default) return parsed.default
    } catch { /* legacy fallback */ }
  }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
}

function validEmail(value: string) {
  return /^\S+@\S+\.\S+$/.test(value)
}

function validSlug(value: string) {
  return /^[a-z0-9](?:[a-z0-9-]{0,48}[a-z0-9])?$/.test(value)
}

function duplicateMessage(message: string) {
  const haystack = message.toLowerCase()
  return /already registered|already exists|user.*exists|email.*exists|duplicate|unique/.test(haystack)
}

async function getAuthorizedContext(req: Request) {
  const authorization = req.headers.get("Authorization")
  if (!authorization) throw new Error("UNAUTHORIZED")

  const url = Deno.env.get("SUPABASE_URL") ?? ""
  const publishableKey = getPublishableKey()
  const secretKey = getSecretKey()
  if (!url || !publishableKey || !secretKey) throw new Error("CONFIGURATION")

  const token = authorization.replace(/^Bearer\s+/i, "")
  const userClient = createClient(url, publishableKey, {
    global: { headers: { Authorization: authorization } },
  })
  const { data: authData, error: authError } = await userClient.auth.getUser(token)
  if (authError || !authData.user) throw new Error("UNAUTHORIZED")

  const admin = createClient(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  })

  const { data: operator, error: operatorError } = await admin
    .from("platform_operators")
    .select("user_id,active")
    .eq("user_id", authData.user.id)
    .eq("active", true)
    .maybeSingle()

  if (operatorError || !operator) throw new Error("FORBIDDEN")
  return { url, admin, actor: authData.user }
}

async function listTenants(admin: ReturnType<typeof createClient>) {
  const [{ data: tenants, error: tenantError }, { data: profiles, error: profileError }] = await Promise.all([
    admin.from("tenants").select("id,slug,name,plan,active,created_at,updated_at").order("created_at", { ascending: false }),
    admin.from("profiles").select("id,tenant_id,full_name,email,role,active").order("created_at", { ascending: true }),
  ])

  if (tenantError) throw tenantError
  if (profileError) throw profileError

  const profileRows = profiles ?? []
  const grouped = new Map<string, typeof profileRows>()
  for (const profile of profileRows) {
    const key = String(profile.tenant_id)
    const rows = grouped.get(key) ?? []
    rows.push(profile)
    grouped.set(key, rows)
  }

  return (tenants ?? []).map(tenant => {
    const companyProfiles = grouped.get(String(tenant.id)) ?? []
    const firstAdmin = companyProfiles.find(row => row.role === "admin" && row.active !== false)
    return {
      id: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
      plan: tenant.plan,
      active: tenant.active,
      created_at: tenant.created_at,
      updated_at: tenant.updated_at,
      user_count: companyProfiles.length,
      admin_count: companyProfiles.filter(row => row.role === "admin").length,
      first_admin: firstAdmin
        ? { id: firstAdmin.id, name: firstAdmin.full_name ?? "", email: firstAdmin.email ?? "", active: firstAdmin.active !== false }
        : null,
    }
  })
}

async function createTenant(admin: ReturnType<typeof createClient>, actorId: string, body: Record<string, unknown>) {
  const name = String(body.company_name ?? "").trim()
  const slug = String(body.slug ?? "").trim().toLowerCase()
  const plan = String(body.plan ?? "trial").trim().toLowerCase()
  const adminName = String(body.admin_name ?? "").trim()
  const adminEmail = String(body.admin_email ?? "").trim().toLowerCase()
  const initialPassword = String(body.initial_password ?? "")

  if (name.length < 2) return errorResponse("VALIDATION_ERROR", "اسم الشركة مطلوب.", 400)
  if (!validSlug(slug)) return errorResponse("VALIDATION_ERROR", "معرّف الشركة يجب أن يحتوي على حروف إنجليزية صغيرة وأرقام وشرطة فقط.", 400)
  if (!PLANS.has(plan)) return errorResponse("VALIDATION_ERROR", "خطة الشركة غير صالحة.", 400)
  if (adminName.length < 2) return errorResponse("VALIDATION_ERROR", "اسم أول مدير مطلوب.", 400)
  if (!validEmail(adminEmail)) return errorResponse("VALIDATION_ERROR", "بريد أول مدير غير صالح.", 400)
  if (initialPassword.length < 8) return errorResponse("VALIDATION_ERROR", "كلمة المرور المؤقتة يجب ألا تقل عن 8 أحرف.", 400)

  const { data: existingTenant, error: existingError } = await admin
    .from("tenants")
    .select("id")
    .eq("slug", slug)
    .maybeSingle()
  if (existingError) throw existingError
  if (existingTenant) return errorResponse("TENANT_EXISTS", "معرّف الشركة مستخدم بالفعل.", 409)

  const { data: tenant, error: tenantError } = await admin
    .from("tenants")
    .insert({ slug, name, plan, active: true })
    .select("id,slug,name,plan,active,created_at,updated_at")
    .single()
  if (tenantError || !tenant) throw tenantError ?? new Error("تعذر إنشاء الشركة.")

  const cleanup = async () => {
    try { await admin.from("organization_settings").delete().eq("tenant_id", tenant.id) } catch { /* best effort */ }
    try { await admin.from("profiles").delete().eq("tenant_id", tenant.id) } catch { /* best effort */ }
    try { await admin.from("tenants").delete().eq("id", tenant.id) } catch { /* best effort */ }
  }

  try {
    const { error: settingsError } = await admin
      .from("organization_settings")
      .insert({
        tenant_id: tenant.id,
        company_name: name,
        group_name: name,
        currency_code: "EGP",
        vat: 14,
        diesel: 0,
        petrol: 0,
        alert_days: 30,
        alert_km: 1500,
        alert_hours: 80,
        trip_geofence_radius_m: 1000,
        print_settings: {},
      })
    if (settingsError) throw settingsError

    const { data: created, error: authError } = await admin.auth.admin.createUser({
      email: adminEmail,
      password: initialPassword,
      email_confirm: true,
      user_metadata: { full_name: adminName, tenant_id: tenant.id },
    })
    if (authError || !created.user) {
      const message = authError?.message ?? "تعذر إنشاء حساب أول مدير."
      await cleanup()
      return errorResponse(duplicateMessage(message) ? "USER_EXISTS" : "AUTH_CREATE_FAILED", duplicateMessage(message) ? "البريد الإلكتروني مستخدم بالفعل." : message, duplicateMessage(message) ? 409 : 400)
    }

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .upsert({
        id: created.user.id,
        email: adminEmail,
        full_name: adminName,
        role: "admin",
        active: true,
        must_change_password: true,
        driver_id: null,
        tenant_id: tenant.id,
      })
      .select("id,email,full_name,role,active,must_change_password")
      .single()

    if (profileError || !profile) {
      await admin.auth.admin.deleteUser(created.user.id)
      await cleanup()
      throw profileError ?? new Error("تعذر تهيئة ملف أول مدير.")
    }

    try {
      await admin.from("audit_log").insert({
        id: crypto.randomUUID(),
        user_id: actorId,
        username: adminEmail,
        action: "create",
        entity: "tenant",
        reference: tenant.id,
        details: `تم إنشاء شركة ${name} بخطة ${plan} وإنشاء أول مدير للنظام.`,
        source: "platform-admin",
        metadata: { tenant_id: tenant.id, tenant_slug: slug, plan, first_admin_id: profile.id },
      })
    } catch (auditError) {
      console.error("platform-admin audit_insert_failed", auditError instanceof Error ? auditError.message : String(auditError))
    }

    return response({
      tenant: {
        id: tenant.id,
        slug: tenant.slug,
        name: tenant.name,
        plan: tenant.plan,
        active: tenant.active,
        created_at: tenant.created_at,
        updated_at: tenant.updated_at,
        user_count: 1,
        admin_count: 1,
        first_admin: {
          id: profile.id,
          name: profile.full_name,
          email: profile.email,
          active: profile.active,
        },
      },
    }, 201)
  } catch (error) {
    try {
      const { data: authUser } = await admin.auth.admin.listUsers({ page: 1, perPage: 100 })
      const createdUser = authUser.users.find(user => String(user.user_metadata?.tenant_id ?? "") === tenant.id && (user.email ?? "").toLowerCase() === adminEmail)
      if (createdUser) await admin.auth.admin.deleteUser(createdUser.id)
    } catch { /* cleanup is best effort */ }
    await cleanup()
    throw error
  }
}

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  if (req.method !== "POST") return errorResponse("METHOD_NOT_ALLOWED", "الطريقة غير مسموحة.", 405)

  try {
    const context = await getAuthorizedContext(req)
    const body = await req.json() as Record<string, unknown>
    const action = String(body.action ?? "list").trim()

    if (action === "list") return response({ tenants: await listTenants(context.admin) })
    if (action === "create") return await createTenant(context.admin, context.actor.id, body)
    return errorResponse("VALIDATION_ERROR", "الإجراء المطلوب غير معروف.", 400)
  } catch (error) {
    const code = error instanceof Error ? error.message : "INTERNAL_ERROR"
    if (code === "UNAUTHORIZED") return errorResponse(code, "جلسة المستخدم غير صالحة.", 401)
    if (code === "FORBIDDEN") return errorResponse(code, "هذه العملية متاحة لمالك المنصة فقط.", 403)
    if (code === "CONFIGURATION") return errorResponse("INTERNAL_ERROR", "إعدادات وظيفة إدارة المنصة غير مكتملة.", 500)
    console.error("platform-admin unexpected_error", error instanceof Error ? error.message : String(error))
    return errorResponse("INTERNAL_ERROR", "حدث خطأ غير متوقع في إدارة الشركات.", 500)
  }
})
