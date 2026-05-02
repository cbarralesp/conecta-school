import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { API_CONFIG } from '../constants/api.config';
import { ChileRegion } from '../models/location.models';
import { normalizeDashboardText } from '../utils/text-normalizer';

@Injectable({ providedIn: 'root' })
export class LocationApiService {
  private readonly http = inject(HttpClient);

  getChileRegions(): Observable<ChileRegion[]> {
    return this.http.get<ChileRegion[]>(`${API_CONFIG.baseUrl}/catalogos/ubicaciones/chile`).pipe(
      map((regions) => regions.map((region) => ({
        ...region,
        code: normalizeDashboardText(region.code),
        name: normalizeDashboardText(region.name),
        communes: region.communes
          .map((commune) => ({
            ...commune,
            name: normalizeDashboardText(commune.name)
          }))
          .sort((left, right) => left.name.localeCompare(right.name, 'es'))
      })))
    );
  }
}
