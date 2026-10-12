import impero from './maps/impero.jpg';
import talabheim from './maps/talabheim.jpg';
import type { BookMap } from '..';

/** The regional maps of the book (Mappe), ready to become scenes. */
export const WTOW_MAPS: BookMap[] = [
  { id: 'talabheim', name: 'Talabheim e dintorni', description: 'Il Talabecland attorno al cratere: la Grande Foresta, le Colline Ululanti e il Talabec.', url: talabheim, widthCells: 40, heightCells: 25 },
  { id: 'impero', name: 'L’Impero diviso', description: 'Le province dell’Impero e i regni vicini, dalla Bretonnia alla Sylvania.', url: impero, widthCells: 40, heightCells: 25 },
];
