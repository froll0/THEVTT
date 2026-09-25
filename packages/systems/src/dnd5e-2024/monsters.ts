/**
 * Bestiary: common monsters from the System Reference Document (CC-BY-4.0),
 * simplified for the table. Speeds in metres. The GM can adjust any token.
 */

import type { Ability } from './data';
import { MORE_MONSTERS } from './monsters-more';

export interface MonsterAction {
  name: string;
  /** attack roll bonus */
  attack?: number;
  damage?: string;
  damageType?: string;
  save?: { ability: Ability; dc: number };
  reach?: string;
  description?: string;
  recharge?: string;
}

export interface MonsterDef {
  id: string;
  name: string;
  size: 'Minuscola' | 'Piccola' | 'Media' | 'Grande' | 'Enorme' | 'Mastodontica';
  type: string;
  ac: number;
  hp: { average: number; dice: string };
  speed: string;
  abilities: Record<Ability, number>;
  cr: string;
  xp: number;
  senses?: string;
  traits?: { name: string; description: string }[];
  actions: MonsterAction[];
}

const A = (str: number, dex: number, con: number, int: number, wis: number, cha: number): Record<Ability, number> => ({ str, dex, con, int, wis, cha });

const BASE_MONSTERS: MonsterDef[] = [
  {
    id: 'commoner', name: 'Popolano', size: 'Media', type: 'Umanoide', ac: 10, hp: { average: 4, dice: '1d8' }, speed: '9 m',
    abilities: A(10, 10, 10, 10, 10, 10), cr: '0', xp: 10,
    actions: [{ name: 'Randello', attack: 2, damage: '1d4', damageType: 'contundenti', reach: '1,5 m' }],
  },
  {
    id: 'giantRat', name: 'Ratto gigante', size: 'Piccola', type: 'Bestia', ac: 12, hp: { average: 7, dice: '2d6' }, speed: '9 m',
    abilities: A(7, 15, 11, 2, 10, 4), cr: '1/8', xp: 25, senses: 'Scurovisione 18 m',
    traits: [{ name: 'Tattiche di branco', description: 'Vantaggio agli attacchi se un alleato è entro 1,5 m dal bersaglio.' }],
    actions: [{ name: 'Morso', attack: 4, damage: '1d4+2', damageType: 'perforanti', reach: '1,5 m' }],
  },
  {
    id: 'bandit', name: 'Bandito', size: 'Media', type: 'Umanoide', ac: 12, hp: { average: 11, dice: '2d8+2' }, speed: '9 m',
    abilities: A(11, 12, 12, 10, 10, 10), cr: '1/8', xp: 25,
    actions: [
      { name: 'Scimitarra', attack: 3, damage: '1d6+1', damageType: 'taglienti', reach: '1,5 m' },
      { name: 'Balestra leggera', attack: 3, damage: '1d8+1', damageType: 'perforanti', reach: '24/96 m' },
    ],
  },
  {
    id: 'cultist', name: 'Cultista', size: 'Media', type: 'Umanoide', ac: 12, hp: { average: 9, dice: '2d8' }, speed: '9 m',
    abilities: A(11, 12, 10, 10, 11, 10), cr: '1/8', xp: 25,
    traits: [{ name: 'Devozione oscura', description: 'Vantaggio ai TS contro Affascinato e Spaventato.' }],
    actions: [{ name: 'Falcetto rituale', attack: 3, damage: '1d4+1', damageType: 'taglienti', reach: '1,5 m' }],
  },
  {
    id: 'guard', name: 'Guardia', size: 'Media', type: 'Umanoide', ac: 16, hp: { average: 11, dice: '2d8+2' }, speed: '9 m',
    abilities: A(13, 12, 12, 10, 11, 10), cr: '1/8', xp: 25,
    actions: [{ name: 'Lancia', attack: 3, damage: '1d6+1', damageType: 'perforanti', reach: '1,5 m o 6/18 m', description: '1d8+1 se impugnata a due mani.' }],
  },
  {
    id: 'kobold', name: 'Coboldo guerriero', size: 'Piccola', type: 'Drago', ac: 14, hp: { average: 7, dice: '3d6-3' }, speed: '9 m',
    abilities: A(7, 15, 9, 8, 7, 8), cr: '1/8', xp: 25, senses: 'Scurovisione 18 m',
    traits: [
      { name: 'Tattiche di branco', description: 'Vantaggio agli attacchi se un alleato è entro 1,5 m dal bersaglio.' },
      { name: 'Sensibilità alla luce solare', description: 'Svantaggio a prove e attacchi alla luce del sole.' },
    ],
    actions: [{ name: 'Pugnale', attack: 4, damage: '1d4+2', damageType: 'perforanti', reach: '1,5 m o 6/18 m' }],
  },
  {
    id: 'goblinWarrior', name: 'Guerriero goblin', size: 'Piccola', type: 'Folletto (goblinoide)', ac: 15, hp: { average: 10, dice: '3d6' }, speed: '9 m',
    abilities: A(8, 15, 10, 10, 8, 8), cr: '1/4', xp: 50, senses: 'Scurovisione 18 m',
    traits: [{ name: 'Fuga agile', description: 'Disimpegno o Nascondersi come azione bonus.' }],
    actions: [
      { name: 'Scimitarra', attack: 4, damage: '1d6+2', damageType: 'taglienti', reach: '1,5 m', description: '+1d4 taglienti se aveva Vantaggio.' },
      { name: 'Arco corto', attack: 4, damage: '1d6+2', damageType: 'perforanti', reach: '24/96 m', description: '+1d4 perforanti se aveva Vantaggio.' },
    ],
  },
  {
    id: 'skeleton', name: 'Scheletro', size: 'Media', type: 'Non morto', ac: 14, hp: { average: 13, dice: '2d8+4' }, speed: '9 m',
    abilities: A(10, 16, 15, 6, 8, 5), cr: '1/4', xp: 50, senses: 'Scurovisione 18 m',
    traits: [{ name: 'Vulnerabilità', description: 'Danni contundenti raddoppiati; immune a veleno e Indebolimento.' }],
    actions: [
      { name: 'Spada corta', attack: 5, damage: '1d6+3', damageType: 'perforanti', reach: '1,5 m' },
      { name: 'Arco corto', attack: 5, damage: '1d6+3', damageType: 'perforanti', reach: '24/96 m' },
    ],
  },
  {
    id: 'zombie', name: 'Zombi', size: 'Media', type: 'Non morto', ac: 8, hp: { average: 15, dice: '2d8+6' }, speed: '6 m',
    abilities: A(13, 6, 16, 3, 6, 5), cr: '1/4', xp: 50, senses: 'Scurovisione 18 m',
    traits: [{ name: 'Tempra da non morto', description: 'Se scende a 0 PF (non per danni radiosi o critici), TS su Cos CD 5 + danni: se lo supera resta a 1 PF.' }],
    actions: [{ name: 'Schianto', attack: 3, damage: '1d8+1', damageType: 'contundenti', reach: '1,5 m' }],
  },
  {
    id: 'wolf', name: 'Lupo', size: 'Media', type: 'Bestia', ac: 12, hp: { average: 11, dice: '2d8+2' }, speed: '12 m',
    abilities: A(12, 15, 12, 3, 12, 6), cr: '1/4', xp: 50, senses: 'Scurovisione 18 m',
    traits: [{ name: 'Tattiche di branco', description: 'Vantaggio agli attacchi se un alleato è entro 1,5 m dal bersaglio.' }],
    actions: [{ name: 'Morso', attack: 4, damage: '2d4+2', damageType: 'perforanti', reach: '1,5 m', save: { ability: 'str', dc: 11 }, description: 'Se il bersaglio fallisce il TS cade Prono.' }],
  },
  {
    id: 'scout', name: 'Esploratore', size: 'Media', type: 'Umanoide', ac: 13, hp: { average: 16, dice: '3d8+3' }, speed: '9 m',
    abilities: A(11, 14, 12, 11, 13, 11), cr: '1/2', xp: 100,
    traits: [{ name: 'Multiattacco', description: 'Due attacchi in mischia o due a distanza.' }],
    actions: [
      { name: 'Spada corta', attack: 4, damage: '1d6+2', damageType: 'perforanti', reach: '1,5 m' },
      { name: 'Arco lungo', attack: 4, damage: '1d8+2', damageType: 'perforanti', reach: '45/180 m' },
    ],
  },
  {
    id: 'tough', name: 'Bruto', size: 'Media', type: 'Umanoide', ac: 12, hp: { average: 32, dice: '5d8+10' }, speed: '9 m',
    abilities: A(15, 11, 14, 10, 10, 11), cr: '1/2', xp: 100,
    traits: [
      { name: 'Tattiche di branco', description: 'Vantaggio agli attacchi se un alleato è entro 1,5 m dal bersaglio.' },
      { name: 'Multiattacco', description: 'Due attacchi con la mazza.' },
    ],
    actions: [{ name: 'Mazza', attack: 4, damage: '1d6+2', damageType: 'contundenti', reach: '1,5 m' }],
  },
  {
    id: 'giantSpider', name: 'Ragno gigante', size: 'Grande', type: 'Bestia', ac: 14, hp: { average: 26, dice: '4d10+4' }, speed: '9 m, scalare 9 m',
    abilities: A(14, 16, 12, 2, 11, 4), cr: '1', xp: 200, senses: 'Vista cieca 3 m, scurovisione 18 m',
    traits: [{ name: 'Movimento del ragno', description: 'Si muove sulle pareti e percepisce chi tocca la sua ragnatela.' }],
    actions: [
      { name: 'Morso', attack: 5, damage: '1d8+3', damageType: 'perforanti', reach: '1,5 m', save: { ability: 'con', dc: 11 }, description: 'Più 2d8 danni da veleno (metà con TS superato).' },
      { name: 'Ragnatela', attack: 5, reach: '9/18 m', recharge: '5-6', description: 'Il bersaglio è Trattenuto (CD 12 For per liberarsi).' },
    ],
  },
  {
    id: 'ghoul', name: 'Ghoul', size: 'Media', type: 'Non morto', ac: 12, hp: { average: 22, dice: '5d8' }, speed: '9 m',
    abilities: A(13, 15, 10, 7, 10, 6), cr: '1', xp: 200, senses: 'Scurovisione 18 m',
    actions: [
      { name: 'Artigli', attack: 4, damage: '2d4+2', damageType: 'taglienti', reach: '1,5 m', save: { ability: 'con', dc: 10 }, description: 'Se non è un elfo o non morto, TS o Paralizzato per 1 minuto.' },
      { name: 'Morso', attack: 2, damage: '2d6+2', damageType: 'perforanti', reach: '1,5 m' },
    ],
  },
  {
    id: 'goblinBoss', name: 'Capo goblin', size: 'Piccola', type: 'Folletto (goblinoide)', ac: 17, hp: { average: 21, dice: '6d6' }, speed: '9 m',
    abilities: A(10, 15, 10, 10, 8, 10), cr: '1', xp: 200, senses: 'Scurovisione 18 m',
    traits: [
      { name: 'Multiattacco', description: 'Due attacchi con la scimitarra.' },
      { name: 'Reindirizzare l’attacco', description: 'Reazione: quando viene colpito, scambia posto con un goblin entro 1,5 m che subisce l’attacco.' },
    ],
    actions: [{ name: 'Scimitarra', attack: 4, damage: '1d6+2', damageType: 'taglienti', reach: '1,5 m' }],
  },
  {
    id: 'brownBear', name: 'Orso bruno', size: 'Grande', type: 'Bestia', ac: 11, hp: { average: 34, dice: '4d10+12' }, speed: '12 m, scalare 9 m',
    abilities: A(19, 10, 16, 2, 13, 7), cr: '1', xp: 200, senses: 'Scurovisione 18 m',
    traits: [{ name: 'Multiattacco', description: 'Un morso e un attacco con gli artigli.' }],
    actions: [
      { name: 'Morso', attack: 6, damage: '1d8+4', damageType: 'perforanti', reach: '1,5 m' },
      { name: 'Artigli', attack: 6, damage: '2d6+4', damageType: 'taglienti', reach: '1,5 m' },
    ],
  },
  {
    id: 'direWolf', name: 'Lupo crudele', size: 'Grande', type: 'Bestia', ac: 14, hp: { average: 37, dice: '5d10+10' }, speed: '15 m',
    abilities: A(17, 15, 15, 3, 12, 7), cr: '1', xp: 200, senses: 'Scurovisione 18 m',
    traits: [{ name: 'Tattiche di branco', description: 'Vantaggio agli attacchi se un alleato è entro 1,5 m dal bersaglio.' }],
    actions: [{ name: 'Morso', attack: 5, damage: '2d6+3', damageType: 'perforanti', reach: '1,5 m', save: { ability: 'str', dc: 13 }, description: 'Se fallisce il TS cade Prono.' }],
  },
  {
    id: 'harpy', name: 'Arpia', size: 'Media', type: 'Mostruosità', ac: 11, hp: { average: 38, dice: '7d8+7' }, speed: '6 m, volare 12 m',
    abilities: A(12, 13, 12, 7, 10, 13), cr: '1', xp: 200,
    actions: [
      { name: 'Artigli', attack: 3, damage: '2d4+1', damageType: 'taglienti', reach: '1,5 m' },
      { name: 'Canto ammaliante', save: { ability: 'wis', dc: 11 }, description: 'Le creature entro 90 m che la sentono sono Affascinate e si avvicinano.' },
    ],
  },
  {
    id: 'priest', name: 'Sacerdote', size: 'Media', type: 'Umanoide', ac: 13, hp: { average: 27, dice: '5d8+5' }, speed: '9 m',
    abilities: A(10, 10, 12, 13, 16, 13), cr: '2', xp: 450,
    actions: [
      { name: 'Mazza', attack: 2, damage: '1d6', damageType: 'contundenti', reach: '1,5 m', description: '+3d6 radiosi con Espansione divina.' },
      { name: 'Dardo guida', attack: 5, damage: '4d6', damageType: 'radiosi', reach: '36 m' },
      { name: 'Fiamma sacra', save: { ability: 'dex', dc: 13 }, damage: '2d8', damageType: 'radiosi', reach: '18 m' },
    ],
  },
  {
    id: 'ogre', name: 'Ogre', size: 'Grande', type: 'Gigante', ac: 11, hp: { average: 68, dice: '8d10+24' }, speed: '12 m',
    abilities: A(19, 8, 16, 5, 7, 7), cr: '2', xp: 450, senses: 'Scurovisione 18 m',
    actions: [
      { name: 'Randello pesante', attack: 6, damage: '2d8+4', damageType: 'contundenti', reach: '1,5 m' },
      { name: 'Giavellotto', attack: 6, damage: '2d6+4', damageType: 'perforanti', reach: '9/36 m' },
    ],
  },
  {
    id: 'gelatinousCube', name: 'Cubo gelatinoso', size: 'Grande', type: 'Melma', ac: 6, hp: { average: 84, dice: '8d10+40' }, speed: '4,5 m',
    abilities: A(14, 3, 20, 1, 6, 1), cr: '2', xp: 450, senses: 'Vista cieca 18 m',
    traits: [{ name: 'Trasparente', description: 'Difficile da notare: serve una prova di Percezione CD 15.' }],
    actions: [
      { name: 'Pseudopodo', attack: 4, damage: '3d6', damageType: 'acido', reach: '1,5 m' },
      { name: 'Inglobare', save: { ability: 'dex', dc: 12 }, damage: '3d6', damageType: 'acido', description: 'Chi fallisce è inglobato: Trattenuto, 6d6 acido a ogni turno.' },
    ],
  },
  {
    id: 'mimic', name: 'Mimic', size: 'Media', type: 'Mostruosità', ac: 12, hp: { average: 58, dice: '9d8+18' }, speed: '6 m',
    abilities: A(17, 12, 15, 5, 13, 8), cr: '2', xp: 450, senses: 'Scurovisione 18 m',
    traits: [
      { name: 'Mutaforma', description: 'Può assumere l’aspetto di un oggetto; aderisce a chi lo tocca.' },
      { name: 'Adesivo', description: 'Afferra chi colpisce con lo pseudopodo (CD 13 per liberarsi).' },
    ],
    actions: [
      { name: 'Pseudopodo', attack: 5, damage: '1d8+3', damageType: 'contundenti', reach: '1,5 m' },
      { name: 'Morso', attack: 5, damage: '1d8+3', damageType: 'perforanti', reach: '1,5 m', description: 'Più 4d8 danni da acido.' },
    ],
  },
  {
    id: 'knight', name: 'Cavaliere', size: 'Media', type: 'Umanoide', ac: 18, hp: { average: 52, dice: '8d8+16' }, speed: '9 m',
    abilities: A(16, 11, 14, 11, 11, 15), cr: '3', xp: 700,
    traits: [{ name: 'Multiattacco', description: 'Due attacchi in mischia.' }],
    actions: [
      { name: 'Spadone', attack: 5, damage: '2d6+3', damageType: 'taglienti', reach: '1,5 m' },
      { name: 'Balestra pesante', attack: 2, damage: '1d10', damageType: 'perforanti', reach: '30/120 m' },
    ],
  },
  {
    id: 'veteran', name: 'Veterano', size: 'Media', type: 'Umanoide', ac: 17, hp: { average: 58, dice: '9d8+18' }, speed: '9 m',
    abilities: A(16, 13, 14, 10, 11, 10), cr: '3', xp: 700,
    traits: [{ name: 'Multiattacco', description: 'Due attacchi con la spada lunga.' }],
    actions: [
      { name: 'Spada lunga', attack: 5, damage: '1d8+3', damageType: 'taglienti', reach: '1,5 m' },
      { name: 'Balestra pesante', attack: 3, damage: '1d10+1', damageType: 'perforanti', reach: '30/120 m' },
    ],
  },
  {
    id: 'owlbear', name: 'Orsogufo', size: 'Grande', type: 'Mostruosità', ac: 13, hp: { average: 59, dice: '7d10+21' }, speed: '12 m',
    abilities: A(20, 12, 17, 3, 12, 7), cr: '3', xp: 700, senses: 'Scurovisione 18 m',
    traits: [{ name: 'Multiattacco', description: 'Un attacco con il becco e uno con gli artigli.' }],
    actions: [
      { name: 'Becco', attack: 7, damage: '1d10+5', damageType: 'perforanti', reach: '1,5 m' },
      { name: 'Artigli', attack: 7, damage: '2d8+5', damageType: 'taglienti', reach: '1,5 m' },
    ],
  },
  {
    id: 'basilisk', name: 'Basilisco', size: 'Media', type: 'Mostruosità', ac: 15, hp: { average: 52, dice: '8d8+16' }, speed: '6 m',
    abilities: A(16, 8, 15, 2, 8, 7), cr: '3', xp: 700, senses: 'Scurovisione 18 m',
    traits: [{ name: 'Sguardo pietrificante', description: 'Chi incrocia il suo sguardo entro 9 m fa un TS su Cos CD 12: Trattenuto, poi Pietrificato.' }],
    actions: [{ name: 'Morso', attack: 5, damage: '2d6+3', damageType: 'perforanti', reach: '1,5 m', description: 'Più 2d6 danni da veleno.' }],
  },
  {
    id: 'minotaur', name: 'Minotauro', size: 'Grande', type: 'Mostruosità', ac: 14, hp: { average: 85, dice: '10d10+30' }, speed: '12 m',
    abilities: A(18, 11, 16, 6, 16, 9), cr: '3', xp: 700, senses: 'Scurovisione 18 m',
    traits: [{ name: 'Carica', description: 'Se si muove di 3 m in linea retta e colpisce con le corna: +2d8 perforanti e TS For CD 14 o Prono.' }],
    actions: [
      { name: 'Ascia bipenne', attack: 6, damage: '2d12+4', damageType: 'taglienti', reach: '1,5 m' },
      { name: 'Corna', attack: 6, damage: '2d8+4', damageType: 'perforanti', reach: '1,5 m' },
    ],
  },
  {
    id: 'wight', name: 'Wight', size: 'Media', type: 'Non morto', ac: 14, hp: { average: 45, dice: '6d8+18' }, speed: '9 m',
    abilities: A(15, 14, 16, 10, 13, 15), cr: '3', xp: 700, senses: 'Scurovisione 18 m',
    traits: [{ name: 'Multiattacco', description: 'Due attacchi con la spada lunga, o uno sostituito dal Risucchio vitale.' }],
    actions: [
      { name: 'Spada lunga', attack: 4, damage: '1d8+2', damageType: 'taglienti', reach: '1,5 m' },
      { name: 'Risucchio vitale', attack: 4, damage: '1d6+2', damageType: 'necrotici', reach: '1,5 m', save: { ability: 'con', dc: 13 }, description: 'Riduce i PF massimi del bersaglio.' },
    ],
  },
  {
    id: 'mage', name: 'Mago', size: 'Media', type: 'Umanoide', ac: 15, hp: { average: 40, dice: '9d8' }, speed: '9 m',
    abilities: A(9, 14, 11, 17, 12, 11), cr: '6', xp: 2300,
    traits: [{ name: 'Incantesimi', description: 'Scudo, Passo velato, Controincantesimo, Palla di fuoco, Invisibilità superiore, Cono di freddo.' }],
    actions: [
      { name: 'Dardo di fuoco', attack: 6, damage: '2d10', damageType: 'fuoco', reach: '36 m' },
      { name: 'Palla di fuoco', save: { ability: 'dex', dc: 14 }, damage: '8d6', damageType: 'fuoco', reach: '45 m' },
      { name: 'Cono di freddo', save: { ability: 'con', dc: 14 }, damage: '8d8', damageType: 'freddo', reach: 'cono 18 m' },
    ],
  },
  {
    id: 'troll', name: 'Troll', size: 'Grande', type: 'Gigante', ac: 15, hp: { average: 94, dice: '9d10+45' }, speed: '9 m',
    abilities: A(18, 13, 20, 7, 9, 7), cr: '5', xp: 1800, senses: 'Scurovisione 18 m',
    traits: [
      { name: 'Rigenerazione', description: 'Recupera 10 PF all’inizio del turno, se non ha subito danni da acido o fuoco.' },
      { name: 'Multiattacco', description: 'Un morso e due attacchi con gli artigli.' },
    ],
    actions: [
      { name: 'Morso', attack: 7, damage: '1d6+4', damageType: 'perforanti', reach: '1,5 m' },
      { name: 'Artigli', attack: 7, damage: '2d6+4', damageType: 'taglienti', reach: '1,5 m' },
    ],
  },
  {
    id: 'vampireSpawn', name: 'Progenie vampirica', size: 'Media', type: 'Non morto', ac: 15, hp: { average: 82, dice: '11d8+33' }, speed: '9 m',
    abilities: A(16, 16, 16, 11, 10, 12), cr: '5', xp: 1800, senses: 'Scurovisione 18 m',
    traits: [
      { name: 'Rigenerazione', description: 'Recupera 10 PF all’inizio del turno, se non è alla luce del sole o in acqua corrente.' },
      { name: 'Multiattacco', description: 'Due attacchi, solo uno dei quali può essere un morso.' },
    ],
    actions: [
      { name: 'Artigli', attack: 6, damage: '2d4+3', damageType: 'taglienti', reach: '1,5 m' },
      { name: 'Morso', attack: 6, damage: '1d6+3', damageType: 'perforanti', reach: '1,5 m', description: 'Più 3d6 necrotici e recupera PF pari ai necrotici.' },
    ],
  },
  {
    id: 'wraith', name: 'Spettro', size: 'Media', type: 'Non morto', ac: 13, hp: { average: 67, dice: '9d8+27' }, speed: '0 m, volare 18 m',
    abilities: A(6, 16, 16, 12, 14, 15), cr: '5', xp: 1800, senses: 'Scurovisione 18 m',
    traits: [{ name: 'Incorporeo', description: 'Attraversa creature e oggetti; resistenza a molti danni.' }],
    actions: [{ name: 'Risucchio vitale', attack: 6, damage: '4d8+3', damageType: 'necrotici', reach: '1,5 m', save: { ability: 'con', dc: 14 }, description: 'Riduce i PF massimi del bersaglio.' }],
  },
  {
    id: 'youngRedDragon', name: 'Giovane drago rosso', size: 'Grande', type: 'Drago', ac: 18, hp: { average: 178, dice: '17d10+85' }, speed: '12 m, scalare 12 m, volare 24 m',
    abilities: A(23, 10, 21, 14, 11, 19), cr: '10', xp: 5900, senses: 'Vista cieca 9 m, scurovisione 36 m',
    traits: [{ name: 'Multiattacco', description: 'Un morso e due attacchi con gli artigli.' }],
    actions: [
      { name: 'Morso', attack: 10, damage: '2d10+6', damageType: 'perforanti', reach: '3 m', description: 'Più 1d6 danni da fuoco.' },
      { name: 'Artigli', attack: 10, damage: '2d6+6', damageType: 'taglienti', reach: '1,5 m' },
      { name: 'Soffio di fuoco', save: { ability: 'dex', dc: 17 }, damage: '16d6', damageType: 'fuoco', reach: 'cono 9 m', recharge: '5-6' },
    ],
  },
  {
    id: 'adultRedDragon', name: 'Drago rosso adulto', size: 'Enorme', type: 'Drago', ac: 19, hp: { average: 256, dice: '19d12+133' }, speed: '12 m, scalare 12 m, volare 24 m',
    abilities: A(27, 10, 25, 16, 13, 21), cr: '17', xp: 18000, senses: 'Vista cieca 18 m, scurovisione 36 m',
    traits: [
      { name: 'Resistenza leggendaria', description: '3 volte al giorno può scegliere di superare un TS fallito.' },
      { name: 'Multiattacco', description: 'Presenza terrificante, un morso e due artigli.' },
    ],
    actions: [
      { name: 'Morso', attack: 14, damage: '2d10+8', damageType: 'perforanti', reach: '3 m', description: 'Più 2d6 danni da fuoco.' },
      { name: 'Artigli', attack: 14, damage: '2d6+8', damageType: 'taglienti', reach: '3 m' },
      { name: 'Soffio di fuoco', save: { ability: 'dex', dc: 21 }, damage: '18d6', damageType: 'fuoco', reach: 'cono 18 m', recharge: '5-6' },
    ],
  },
];

export const MONSTERS: MonsterDef[] = [...BASE_MONSTERS, ...MORE_MONSTERS];

export const monsterById = (id: string) => MONSTERS.find((m) => m.id === id);

export const MONSTER_SIZES: MonsterDef['size'][] = ['Minuscola', 'Piccola', 'Media', 'Grande', 'Enorme', 'Mastodontica'];

/** Squares a creature of this size occupies on the grid (per side). */
export const sizeCells = (size: MonsterDef['size']) => ({ Minuscola: 1, Piccola: 1, Media: 1, Grande: 2, Enorme: 3, Mastodontica: 4 })[size] ?? 1;

export const CHALLENGE_RATINGS = ['0', '1/8', '1/4', '1/2', ...Array.from({ length: 30 }, (_, i) => String(i + 1))];

const XP: Record<string, number> = {
  '0': 10, '1/8': 25, '1/4': 50, '1/2': 100, '1': 200, '2': 450, '3': 700, '4': 1100, '5': 1800, '6': 2300, '7': 2900, '8': 3900, '9': 5000,
  '10': 5900, '11': 7200, '12': 8400, '13': 10000, '14': 11500, '15': 13000, '16': 15000, '17': 18000, '18': 20000, '19': 22000, '20': 25000,
  '21': 33000, '22': 41000, '23': 50000, '24': 62000, '25': 75000, '26': 90000, '27': 105000, '28': 120000, '29': 135000, '30': 155000,
};
export const xpForCr = (cr: string) => XP[cr] ?? 0;

/** Proficiency bonus by challenge rating (2 up to CR 4, then +1 every 4). */
export const crProficiency = (cr: string) => Math.max(2, Math.floor((Math.max(1, crValue(cr)) - 1) / 4) + 2);

/** A blank creature to start the homebrew editor from. */
export function blankMonster(): MonsterDef {
  return {
    id: '',
    name: 'Nuova creatura',
    size: 'Media',
    type: 'Umanoide',
    ac: 12,
    hp: { average: 11, dice: '2d8+2' },
    speed: '9 m',
    abilities: A(10, 10, 10, 10, 10, 10),
    cr: '1/2',
    xp: 100,
    actions: [{ name: 'Attacco', attack: 3, damage: '1d6+1', damageType: 'contundenti', reach: '1,5 m' }],
  };
}

/** Average of a dice expression like 4d8+12 (for the HP helper). */
export function averageOf(dice: string): number | null {
  const m = /^\s*(\d+)d(\d+)\s*([+-]\s*\d+)?\s*$/i.exec(dice);
  if (!m) return null;
  const n = Number(m[1]);
  const sides = Number(m[2]);
  const mod = m[3] ? Number(m[3].replace(/\s/g, '')) : 0;
  return Math.floor((n * (sides + 1)) / 2) + mod;
}

export function crValue(cr: string): number {
  return cr.includes('/') ? Number(cr.split('/')[0]) / Number(cr.split('/')[1]) : Number(cr);
}

export const monsterMod = (score: number) => Math.floor((score - 10) / 2);

/** Darkvision in metres read from a stat block's senses ("Scurovisione 18 m"). */
export function monsterDarkvision(m: Pick<MonsterDef, 'senses'>): number {
  const match = /scurovisione\s+(\d+(?:[.,]\d+)?)\s*m/i.exec(m.senses ?? '');
  return match ? Number(match[1]!.replace(',', '.')) : 0;
}
