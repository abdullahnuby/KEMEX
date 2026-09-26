import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "npm:@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

const ROLES = new Set(["admin", "mgmt", "fleet", "pm", "eng", "maint", "acct", "driver"])

type ErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "VALIDATION_ERROR"
  | "USER_EXISTS"
  | "AUTH_CREATE_FAILED"
  | "DRIVER_INVALID"
  | "PROFILE_INIT_FAILED"
  | "INTERNAL_ERROR"

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

function errorResponse(code: ErrorCode, message: string, status: number) {
  return response({ error_code: code, error: message }, status)
}

function getPublishableKey() {
  const raw = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS")
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Record<string, string>
      if (parsed.default) return parsed.default
    } catch { /* fall through to legacy names */ }
  }
  return Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? ""
}

function getSecretKey() {
  const raw = Deno.env.get("SUPABASE_SECRET_KEYS")
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Record<string, string>
      if (parsed.default) return parsed.default
    } catch { /* fall through to legacy name */ }
  }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
}

function looksLikeDuplicateUser(message: string, code?: string) {
  const haystack = `${code ?? ""} ${message}`.toLowerCase()
  return /already registered|already exists|user.*exists|email.*exists|duplicate|unique/.test(haystack)
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  if (req.method !== "POST") return errorResponse("VALIDATION_ERROR", "الطريقة غير مسموحة.", 405)

  try {
    const authorization = req.headers.get("Authorization")
    if (!authorization) return errorResponse("UNAUTHORIZED", "يجب تسجيل الدخول بحساب إداري.", 401)

    const url = Deno.env.get("SUPABASE_URL") ?? ""
    const publishableKey = getPublishableKey()
    const secretKey = getSecretKey()
    if (!url || !publishableKey || !secretKey) {
      console.error("admin-create-user configuration_missing")
      return errorResponse("INTERNAL_ERROR", "إعدادات وظيفة إنشاء الحسابات غير مكتملة.", 500)
    }

    const token = authorization.replace(/^Bearer\s+/i, "")
    const userClient = createClient(url, publishableKey, {
      global: { headers: { Authorization: authorization } },
    })

    const { data: authData, error: authError } = await userClient.auth.getUser(token)
    if (authError || !authData.user) return errorResponse("UNAUTHORIZED", "جلسة المستخدم غير صالحة.", 401)

    const { data: actor, error: actorError } = await userClient
      .from("profiles")
      .select("role,active,tenant_id")
      .eq("id", authData.user.id)
      .single()

    if (actorError || !actor || actor.active !== true || actor.role !== "admin") {
      return errorResponse("FORBIDDEN", "إنشاء الحسابات متاح لمدير النظام فقط.", 403)
    }
    const actorTenantId = actor.tenant_id as string | null
    if (!actorTenantId) {
      return errorResponse("FORBIDDEN", "حساب المدير غير مرتبط بمنشأة. تواصل مع الدعم الفني.", 403)
    }

    const body = await req.json() as Record<string, unknown>
    const email = String(body.email ?? "").trim().toLowerCase()
    const fullName = String(body.full_name ?? "").trim()
    const role = String(body.role ?? "").trim()
    const initialPassword = String(body.initial_password ?? "")
    const driverId = body.driver_id == null || String(body.driver_id).trim() === ""
      ? null
      : String(body.driver_id).trim()

    if (!/^\S+@\S+\.\S+$/.test(email)) return errorResponse("VALIDATION_ERROR", "البريد الإلكتروني غير صالح.", 400)
    if (fullName.length < 2) return errorResponse("VALIDATION_ERROR", "الاسم الكامل مطلوب.", 400)
    if (!ROLES.has(role)) return errorResponse("VALIDATION_ERROR", "الدور المحدد غير صالح.", 400)
    if (initialPassword.length < 8) return errorResponse("VALIDATION_ERROR", "كلمة المرور المؤقتة يجب ألا تقل عن 8 أحرف.", 400)
    if (role === "driver" && !driverId) return errorResponse("DRIVER_INVALID", "يجب ربط حساب السائق بملف سائق.", 400)
    if (role !== "driver" && driverId) return errorResponse("VALIDATION_ERROR", "لا يجوز ربط ملف سائق بدور غير سائق.", 400)

    const admin = createClient(url, secretKey, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    })

    if (role === "driver") {
      const { data: linked, error: linkedError } = await admin
        .from("profiles")
        .select("id")
        .eq("driver_id", driverId)
        .eq("tenant_id", actorTenantId)
        .limit(1)
        .maybeSingle()
      if (linkedError) {
        console.error("admin-create-user driver_link_lookup_failed", linkedError.message)
        return errorResponse("DRIVER_INVALID", "تعذر التحقق من ربط ملف السائق.", 500)
      }
      if (linked) return errorResponse("DRIVER_INVALID", "ملف السائق مرتبط بالفعل بحساب مستخدم.", 400)

      const { data: driver, error: driverError } = await admin
        .from("drivers")
        .select("id")
        .eq("id", driverId)
        .eq("tenant_id", actorTenantId)
        .limit(1)
        .maybeSingle()
      if (driverError) {
        console.error("admin-create-user driver_lookup_failed", driverError.message)
        return errorResponse("DRIVER_INVALID", "تعذر التحقق من ملف السائق.", 500)
      }
      if (!driver) return errorResponse("DRIVER_INVALID", "ملف السائق المحدد غير موجود.", 400)
    }

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password: initialPassword,
      email_confirm: true,
      user_metadata: { full_name: fullName, tenant_id: actorTenantId },
    })

    if (createError || !created.user) {
      const message = createError?.message ?? "تعذر إنشاء مستخدم المصادقة."
      const duplicate = looksLikeDuplicateUser(message, String((createError as { code?: unknown } | null)?.code ?? ""))
      console.error("admin-create-user auth_create_failed", {
        code: (createError as { code?: unknown } | null)?.code ?? null,
        status: (createError as { status?: unknown } | null)?.status ?? null,
        duplicate,
        message,
      })
      return errorResponse(
        duplicate ? "USER_EXISTS" : "AUTH_CREATE_FAILED",
        duplicate ? "البريد الإلكتروني مستخدم بالفعل. استخدم بريدًا آخر." : message,
        duplicate ? 409 : 400,
      )
    }

    const profileDriverId = role === "driver" ? driverId : null
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .update({
        email,
        full_name: fullName,
        role,
        active: true,
        must_change_password: true,
        driver_id: profileDriverId,
        tenant_id: actorTenantId,
      })
      .eq("id", created.user.id)
      .select("id,email,full_name,role,active,must_change_password,driver_id")
      .single()

    if (profileError || !profile) {
      console.error("admin-create-user profile_init_failed", profileError?.message ?? "profile not returned")
      await admin.auth.admin.deleteUser(created.user.id)
      return errorResponse("PROFILE_INIT_FAILED", "تعذر تهيئة ملف المستخدم بعد إنشاء الحساب.", 500)
    }

    return response({
      user: {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        role: profile.role,
        active: profile.active,
        must_change_password: profile.must_change_password,
        driver_id: profile.driver_id,
      },
    })
  } catch (error) {
    console.error("admin-create-user unexpected_error", error instanceof Error ? error.message : String(error))
    return errorResponse("INTERNAL_ERROR", "حدث خطأ غير متوقع أثناء إنشاء الحساب.", 500)
  }
})
