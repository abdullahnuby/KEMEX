import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "npm:@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

const ROLES = new Set(["admin", "mgmt", "fleet", "pm", "eng", "maint", "acct"])

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

function getSecretKey() {
  const raw = Deno.env.get("SUPABASE_SECRET_KEYS")
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Record<string, string>
      if (parsed.default) return parsed.default
    } catch { /* legacy fallback below */ }
  }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  if (req.method !== "POST") return response({ error: "الطريقة غير مسموحة." }, 405)

  try {
    const authorization = req.headers.get("Authorization")
    if (!authorization) return response({ error: "يجب تسجيل الدخول بحساب إداري." }, 401)

    const url = Deno.env.get("SUPABASE_URL") ?? ""
    const publishableKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? ""
    const secretKey = getSecretKey()
    if (!url || !publishableKey || !secretKey) return response({ error: "إعدادات وظيفة إنشاء الحسابات غير مكتملة." }, 500)

    const userClient = createClient(url, publishableKey, {
      global: { headers: { Authorization: authorization } },
    })
    const token = authorization.replace(/^Bearer\s+/i, "")
    const { data: authData, error: authError } = await userClient.auth.getUser(token)
    if (authError || !authData.user) return response({ error: "جلسة المستخدم غير صالحة." }, 401)

    const { data: actor, error: actorError } = await userClient
      .from("profiles")
      .select("role,active")
      .eq("id", authData.user.id)
      .single()
    if (actorError || !actor || actor.active !== true || actor.role !== "admin") {
      return response({ error: "إنشاء الحسابات متاح لمدير النظام فقط." }, 403)
    }

    const body = await req.json() as Record<string, unknown>
    const email = String(body.email ?? "").trim().toLowerCase()
    const fullName = String(body.full_name ?? "").trim()
    const role = String(body.role ?? "").trim()
    const initialPassword = String(body.initial_password ?? "")

    if (!/^\S+@\S+\.\S+$/.test(email)) return response({ error: "البريد الإلكتروني غير صالح." }, 400)
    if (fullName.length < 2) return response({ error: "الاسم الكامل مطلوب." }, 400)
    if (!ROLES.has(role)) return response({ error: "الدور المحدد غير صالح." }, 400)
    if (initialPassword.length < 8) return response({ error: "كلمة المرور المؤقتة يجب ألا تقل عن 8 أحرف." }, 400)

    const admin = createClient(url, secretKey, { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } })
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password: initialPassword,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    })
    if (createError || !created.user) return response({ error: createError?.message ?? "تعذر إنشاء مستخدم المصادقة." }, 400)

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .update({ email, full_name: fullName, role, active: true, must_change_password: true })
      .eq("id", created.user.id)
      .select("id,email,full_name,role,active,must_change_password")
      .single()

    if (profileError || !profile) {
      await admin.auth.admin.deleteUser(created.user.id)
      return response({ error: profileError?.message ?? "تعذر تهيئة ملف المستخدم." }, 500)
    }

    return response({
      user: {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        role: profile.role,
        active: profile.active,
        must_change_password: profile.must_change_password,
      },
    })
  } catch (error) {
    return response({ error: error instanceof Error ? error.message : "حدث خطأ غير متوقع." }, 500)
  }
})
