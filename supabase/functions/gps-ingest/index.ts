import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "npm:@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-kemex-gps-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

const MAX_BATCH = 100

type IncomingPosition = {
  device_id?: string
  external_device_id?: string
  asset_id?: string
  driver_id?: string | null
  trip_id?: string | null
  latitude?: number | string
  longitude?: number | string
  speed_kmh?: number | string | null
  heading_degrees?: number | string | null
  accuracy_m?: number | string | null
  ignition_on?: boolean | string | null
  recorded_at?: string
  source?: string
  provider?: string | null
  metadata?: Record<string, unknown> | null
}

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  })
}

function secretMatches(req: Request) {
  const expected = Deno.env.get("KEMEX_GPS_INGEST_SECRET") ?? ""
  const supplied = req.headers.get("x-kemex-gps-secret") ?? ""

  return Boolean(expected && supplied && supplied === expected)
}

function numberOrNull(value: unknown) {
  if (value === null || value === undefined || value === "") return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function booleanOrNull(value: unknown) {
  if (value === null || value === undefined || value === "") return null
  if (value === true || value === false) return value
  const normalized = String(value).trim().toLowerCase()
  if (normalized === "true" || normalized === "1" || normalized === "on") return true
  if (normalized === "false" || normalized === "0" || normalized === "off") return false
  return null
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

Deno.serve(async req => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  if (req.method !== "POST") {
    return response({ error: "الطريقة غير مسموحة." }, 405)
  }

  if (!secretMatches(req)) {
    return response({ error: "بيانات اعتماد جهاز GPS غير صالحة." }, 401)
  }

  const url = Deno.env.get("SUPABASE_URL") ?? ""
  const secretKey =
    Deno.env.get("SUPABASE_SECRET_KEYS")
      ? JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}").default
      : Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""

  if (!url || !secretKey) {
    console.error("gps-ingest configuration_missing")
    return response({ error: "إعدادات خدمة GPS غير مكتملة." }, 500)
  }

  const admin = createClient(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  })

  try {
    const body = await req.json() as
      | IncomingPosition
      | { positions?: IncomingPosition[] }
      | IncomingPosition[]

    const items = Array.isArray(body)
      ? body
      : Array.isArray(body.positions)
        ? body.positions
        : [body]

    if (!items.length) {
      return response({ error: "لم يتم إرسال أي قراءة GPS." }, 400)
    }

    if (items.length > MAX_BATCH) {
      return response(
        { error: `الحد الأقصى للدفعة الواحدة هو ${MAX_BATCH} قراءة.` },
        400,
      )
    }

    let accepted = 0
    const rejected: Array<{ index: number; error: string }> = []

    for (let index = 0; index < items.length; index += 1) {
      const item = items[index]
      try {
        const externalId =
          String(
            item.external_device_id ??
              item.device_id ??
              "",
          ).trim()

        if (!externalId) {
          throw new Error("معرّف جهاز GPS مطلوب.")
        }

        const latitude = numberOrNull(item.latitude)
        const longitude = numberOrNull(item.longitude)

        if (
          latitude === null ||
          longitude === null ||
          latitude < -90 ||
          latitude > 90 ||
          longitude < -180 ||
          longitude > 180
        ) {
          throw new Error("إحداثيات GPS غير صالحة.")
        }

        const speed = numberOrNull(item.speed_kmh)
        const heading = numberOrNull(item.heading_degrees)
        const accuracy = numberOrNull(item.accuracy_m)

        if (speed !== null && speed < 0) {
          throw new Error("السرعة لا يمكن أن تكون سالبة.")
        }

        if (
          heading !== null &&
          (heading < 0 || heading > 360)
        ) {
          throw new Error("اتجاه المركبة يجب أن يكون بين صفر و360 درجة.")
        }

        if (accuracy !== null && accuracy < 0) {
          throw new Error("دقة GPS لا يمكن أن تكون سالبة.")
        }

        const recordedAt = item.recorded_at
          ? new Date(item.recorded_at)
          : new Date()

        if (!Number.isFinite(recordedAt.getTime())) {
          throw new Error("وقت قراءة GPS غير صالح.")
        }

        let deviceQuery = admin
          .from("vehicle_gps_devices")
          .select("id,asset_id,provider,external_device_id,active")
          .eq("active", true)

        deviceQuery = isUuid(externalId)
          ? deviceQuery.eq("id", externalId)
          : deviceQuery.eq("external_device_id", externalId)

        const { data: device, error: deviceError } =
          await deviceQuery.maybeSingle()

        if (deviceError) {
          throw new Error("تعذر التحقق من جهاز GPS.")
        }

        if (!device) {
          throw new Error(
            `جهاز GPS غير مسجل أو غير مفعل: ${externalId}`,
          )
        }

        let driverId =
          item.driver_id == null || item.driver_id === ""
            ? null
            : String(item.driver_id)

        let tripId =
          item.trip_id == null || item.trip_id === ""
            ? null
            : String(item.trip_id)

        if (!driverId || !tripId) {
          const { data: currentTrip } = await admin
            .from("trips")
            .select("id,driver_id")
            .eq("truck_asset_id", device.asset_id)
            .in(
              "status",
              [
                "assigned",
                "dispatched",
                "in_transit",
                "delivered",
                "received",
              ],
            )
            .order("scheduled_start", { ascending: false })
            .limit(1)
            .maybeSingle()

          if (currentTrip) {
            tripId ??= String(currentTrip.id)
            driverId ??=
              currentTrip.driver_id == null
                ? null
                : String(currentTrip.driver_id)
          }
        }

        const { error: insertError } = await admin
          .from("vehicle_gps_positions")
          .insert({
            device_id: device.id,
            asset_id: device.asset_id,
            driver_id: driverId,
            trip_id: tripId,
            latitude,
            longitude,
            speed_kmh: speed,
            heading_degrees: heading,
            accuracy_m: accuracy,
            ignition_on: booleanOrNull(item.ignition_on),
            recorded_at: recordedAt.toISOString(),
            source:
              item.source &&
              ["device", "provider", "driver", "manual"].includes(
                item.source,
              )
                ? item.source
                : "provider",
            provider:
              item.provider == null || item.provider === ""
                ? device.provider
                : String(item.provider),
            external_device_id:
              device.external_device_id,
            metadata:
              item.metadata &&
              typeof item.metadata === "object"
                ? item.metadata
                : {},
          })

        if (insertError) {
          throw new Error(
            insertError.message || "تعذر حفظ قراءة GPS.",
          )
        }

        const { error: deviceUpdateError } = await admin
          .from("vehicle_gps_devices")
          .update({
            last_seen_at: recordedAt.toISOString(),
            last_latitude: latitude,
            last_longitude: longitude,
            last_speed_kmh: speed,
          })
          .eq("id", device.id)

        if (deviceUpdateError) {
          console.error(
            "gps-ingest device_update_failed",
            deviceUpdateError.message,
          )
        }

        accepted += 1
      } catch (error) {
        rejected.push({
          index,
          error:
            error instanceof Error
              ? error.message
              : "تعذر معالجة قراءة GPS.",
        })
      }
    }

    return response({
      accepted,
      rejected,
      received: items.length,
    })
  } catch (error) {
    console.error(
      "gps-ingest unexpected_error",
      error instanceof Error ? error.message : String(error),
    )

    return response(
      { error: "حدث خطأ غير متوقع أثناء استقبال قراءات GPS." },
      500,
    )
  }
})
