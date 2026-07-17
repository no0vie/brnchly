import { GraphItem } from '../types';

export const sampleItems: GraphItem[] = [
  {
    name: "Microbial Stage",
    dif: -8,
    description: "Single-celled organism in primordial soup",
    position: { x: 50, y: 80 }
  },
  {
    name: "Creature Stage",
    dif: -3,
    description: "Development of limbs and basic intelligence",
  },
  {
    name: "Tribal Stage",
    dif: 2,
    description: "Formation of social structures and tools",
  },
  {
    name: "Civilization",
    dif: 7,
    description: "Advanced technology and global society",
  },
  {
    name: "Space Stage",
    dif: 10,
    description: "Interstellar exploration and terraforming",
  },
  {
    name: "Galactic Stage",
    dif: 9,
    description: "Conquering the galaxy and beyond",
  },
  {
    name: "Transcendence",
    dif: 10,
    description: "Becoming a god-like entity",
  }
];

export const evolutionTags = [
  "Primordial",
  "Simple",
  "Complex",
  "Intelligent",
  "Galactic",
  "Transcendent",
  "Infinite"
];
