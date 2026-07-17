export interface Position {
  x: number;
  y: number;
}

export interface GraphItem {
  name: string;
  dif: number;
  description: string;
  position?: Position;
}
