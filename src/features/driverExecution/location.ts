import type { GeoLocation } from './types'

export interface LocationProvider { getCurrentLocation(options?: PositionOptions): Promise<GeoLocation> }
export const browserLocationProvider: LocationProvider = {
  getCurrentLocation(options = { enableHighAccuracy: true, maximumAge: 5000, timeout: 8000 }) {
    if (!navigator.geolocation) return Promise.reject(new Error('تعذر التحقق من الموقع'))
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        position => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy }),
        error => reject(new Error(error.code === error.PERMISSION_DENIED ? 'تم رفض صلاحية الموقع.' : 'تعذر التحقق من الموقع')),
        options,
      )
    })
  },
}
