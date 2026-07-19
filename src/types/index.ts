export interface Position {
  x: number;
  y: number;
}

export interface EvolutionStep {
  offset: number;
  description: string;
  name: string;
}

export interface GraphItem {
  name: string;
  dif: number;
  description: string;
  position?: Position;
}
