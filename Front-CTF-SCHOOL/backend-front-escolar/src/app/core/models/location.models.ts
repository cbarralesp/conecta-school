export interface ChileCommune {
  id: number;
  name: string;
}

export interface ChileRegion {
  id: number;
  code: string;
  name: string;
  communes: ChileCommune[];
}
