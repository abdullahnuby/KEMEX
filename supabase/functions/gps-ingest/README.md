# KEMEX gps-ingest

Provider-neutral GPS webhook endpoint for KEMEX fleet telemetry.

## Required secret

Set:

`KEMEX_GPS_INGEST_SECRET`

The GPS provider must send the same value in:

`x-kemex-gps-secret`

The Supabase service/secret key is used only inside the Edge Function.

## Deployment

Because an external GPS provider normally cannot send a Supabase user JWT, deploy this endpoint without the platform JWT gate and keep the custom secret validation enabled:

```bash
supabase functions deploy gps-ingest --no-verify-jwt
```

## Payload

Single reading:

```json
{
  "external_device_id": "IMEI-123456",
  "latitude": 30.0444,
  "longitude": 31.2357,
  "speed_kmh": 52,
  "heading_degrees": 180,
  "accuracy_m": 8,
  "ignition_on": true,
  "recorded_at": "2026-09-25T12:00:00Z"
}
```

Batch:

```json
{
  "positions": [
    {
      "external_device_id": "IMEI-123456",
      "latitude": 30.0444,
      "longitude": 31.2357
    }
  ]
}
```

The device identifier must already exist and be active in `vehicle_gps_devices`.
