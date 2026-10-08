/**
 * What the stat blocks above leave out, by creature: damage resistances,
 * immunities and vulnerabilities, saving throws, legendary and lair actions
 * (SRD 5.2, CC-BY-4.0, simplified for the table).
 */

import type { Ability } from './data';
import type { MonsterAction, MonsterDef } from './monsters';

type Extra = Pick<MonsterDef, 'resistances' | 'immunities' | 'vulnerabilities' | 'saves' | 'legendary' | 'lair'>;

const ELEMENTS = ['acido', 'freddo', 'fuoco', 'fulmine', 'tuono'];
const FIEND = { resistances: ['freddo'], immunities: ['fuoco', 'veleno'] };
const CONSTRUCT = { immunities: ['veleno', 'psichici'] };
const save = (name: string, ability: Ability, dc: number, damage?: string, damageType?: string, description?: string, cost?: number): MonsterAction => ({ name, save: { ability, dc }, damage, damageType, description, cost });
const hit = (name: string, attack: number, damage: string, damageType: string, description?: string, cost?: number): MonsterAction => ({ name, attack, damage, damageType, description, cost });
const other = (name: string, description: string, cost?: number): MonsterAction => ({ name, description, cost });

const RED_LAIR = [other('Magma', 'Il magma erutta da un punto entro 36 m: TS Des CD 15 o 6d6 fuoco.'), other('Tremore', 'Il suolo trema: TS Des CD 15 o Prono.'), other('Gas vulcanici', 'Una nube di 6 m di raggio: TS Cos CD 13 o Avvelenato.')];

export const MONSTER_EXTRAS: Record<string, Extra> = {
  skeleton: { immunities: ['veleno'], vulnerabilities: ['contundenti'] },
  zombie: { immunities: ['veleno'] },
  ghoul: { immunities: ['veleno'] },
  ghast: { resistances: ['necrotici'], immunities: ['veleno'] },
  wight: { resistances: ['necrotici'], immunities: ['veleno'] },
  vampireSpawn: { resistances: ['necrotici'] },
  wraith: { resistances: ELEMENTS, immunities: ['necrotici', 'veleno'] },
  specter: { resistances: ELEMENTS, immunities: ['necrotici', 'veleno'] },
  shadow: { resistances: ELEMENTS, immunities: ['necrotici', 'veleno'], vulnerabilities: ['radiosi'] },
  ghost: { resistances: ['acido', 'fuoco', 'fulmine', 'tuono'], immunities: ['freddo', 'necrotici', 'veleno'] },
  banshee: { resistances: ['acido', 'fuoco', 'fulmine', 'tuono'], immunities: ['freddo', 'necrotici', 'veleno'] },
  mummy: { immunities: ['necrotici', 'veleno'], vulnerabilities: ['fuoco'], saves: { wis: 2 } },
  flameskull: { resistances: ['fulmine', 'necrotici', 'perforanti'], immunities: ['freddo', 'fuoco', 'veleno'] },
  twigBlight: { vulnerabilities: ['fuoco'] },
  swarmInsects: { resistances: ['contundenti', 'perforanti', 'taglienti'] },
  animatedArmor: CONSTRUCT,
  flyingSword: CONSTRUCT,
  gargoyle: CONSTRUCT,
  stoneGolem: CONSTRUCT,
  ironGolem: { immunities: ['fuoco', 'veleno', 'psichici'] },
  imp: { resistances: ['freddo'], immunities: ['fuoco', 'veleno'] },
  quasit: { resistances: ['freddo', 'fuoco', 'fulmine'], immunities: ['veleno'] },
  succubus: { resistances: ['freddo', 'fuoco', 'fulmine', 'veleno'] },
  nightHag: { resistances: ['freddo', 'fuoco'] },
  hellHound: { immunities: ['fuoco'] },
  winterWolf: { immunities: ['freddo'] },
  grayOoze: { resistances: ['acido', 'freddo', 'fuoco'] },
  ochreJelly: { resistances: ['acido'], immunities: ['fulmine', 'taglienti'] },
  blackPudding: { immunities: ['acido', 'freddo', 'fulmine', 'taglienti'] },
  airElemental: { resistances: ['fulmine', 'tuono'], immunities: ['veleno'] },
  earthElemental: { immunities: ['veleno'], vulnerabilities: ['tuono'] },
  fireElemental: { immunities: ['fuoco', 'veleno'] },
  waterElemental: { resistances: ['acido'], immunities: ['veleno'] },
  shamblingMound: { resistances: ['freddo', 'fuoco'], immunities: ['fulmine'] },
  salamander: { immunities: ['fuoco'], vulnerabilities: ['freddo'] },
  fireGiant: { immunities: ['fuoco'], saves: { dex: 3, con: 10, cha: 5 } },
  frostGiant: { immunities: ['freddo'], saves: { con: 8, wis: 3, cha: 4 } },
  efreeti: { immunities: ['fuoco'] },
  djinni: { immunities: ['fulmine', 'tuono'] },
  boneDevil: FIEND,
  erinyes: FIEND,
  pitFiend: FIEND,
  balor: { resistances: ['freddo', 'fulmine'], immunities: ['fuoco', 'veleno'] },
  deva: { resistances: ['radiosi'] },
  couatl: { resistances: ['radiosi'] },
  behir: { immunities: ['fulmine'] },
  remorhaz: { immunities: ['freddo', 'fuoco'] },
  treant: { resistances: ['contundenti', 'perforanti'], vulnerabilities: ['fuoco'] },
  youngWhiteDragon: { immunities: ['freddo'], saves: { dex: 3, con: 7, wis: 3, cha: 4 } },
  youngBlackDragon: { immunities: ['acido'], saves: { dex: 5, con: 6, wis: 3, cha: 5 } },
  youngGreenDragon: { immunities: ['veleno'], saves: { dex: 4, con: 6, wis: 4, cha: 5 } },
  youngBlueDragon: { immunities: ['fulmine'], saves: { dex: 4, con: 8, wis: 5, cha: 7 } },
  youngRedDragon: { immunities: ['fuoco'], saves: { dex: 4, con: 9, wis: 4, cha: 8 } },
  adultRedDragon: {
    immunities: ['fuoco'],
    saves: { dex: 6, con: 13, wis: 7, cha: 11 },
    legendary: {
      uses: 3,
      actions: [
        hit('Balzo', 14, '2d6+8', 'taglienti', 'Si muove fino a metà velocità e colpisce con gli artigli.'),
        save('Raggi infuocati', 'dex', 21, '6d6', 'fuoco', 'Fino a due creature che vede entro 36 m; metà se supera.'),
        save('Presenza imperiosa', 'wis', 18, undefined, undefined, 'Spaventato fino alla fine del suo prossimo turno.', 2),
      ],
    },
    lair: RED_LAIR,
  },
  ancientRedDragon: {
    immunities: ['fuoco'],
    saves: { dex: 7, con: 16, wis: 9, cha: 13 },
    legendary: {
      uses: 3,
      actions: [
        hit('Balzo', 17, '2d8+10', 'taglienti', 'Si muove fino a metà velocità e colpisce con gli artigli.'),
        save('Raggi infuocati', 'dex', 24, '8d6', 'fuoco', 'Fino a due creature che vede entro 36 m; metà se supera.'),
        save('Presenza imperiosa', 'wis', 21, undefined, undefined, 'Spaventato fino alla fine del suo prossimo turno.', 2),
      ],
    },
    lair: RED_LAIR,
  },
  lich: {
    resistances: ['freddo', 'fulmine'],
    immunities: ['necrotici', 'veleno'],
    saves: { con: 10, int: 12, wis: 9 },
    legendary: {
      uses: 3,
      actions: [
        hit('Trucchetto', 12, '3d8', 'freddo', 'Raggio di gelo: la velocità del bersaglio cala di 3 m.'),
        hit('Tocco paralizzante', 12, '3d6+5', 'freddo', 'TS Cos CD 20 o Paralizzato.', 2),
        save('Disturbare la vita', 'con', 20, '6d6', 'necrotici', 'Ogni creatura non morta esclusa entro 6 m; metà se supera.', 3),
      ],
    },
    lair: [other('Rinnovare gli incantesimi', 'Recupera uno slot di 1°–5° livello.'), other('Legame spettrale', 'Un bersaglio entro 9 m: TS Cos CD 18 o 3d6 necrotici e il lich si cura.')],
  },
  vampire: {
    resistances: ['necrotici'],
    saves: { dex: 9, wis: 7, cha: 9 },
    legendary: {
      uses: 3,
      actions: [other('Passo nell’ombra', 'Si muove fino alla sua velocità senza provocare attacchi di opportunità.'), hit('Artiglio', 9, '1d8+4', 'taglienti', 'Afferrato.'), hit('Morso', 9, '1d6+4', 'perforanti', 'Più 3d6 necrotici; si cura dello stesso ammontare.', 2)],
    },
    lair: [other('Nebbia', 'Una nebbia oscura riempie un cubo di 6 m: area pesantemente oscurata.'), other('Porte sbarrate', 'Una porta si chiude e si blocca fino al prossimo 20 d’iniziativa.')],
  },
  mummyLord: {
    immunities: ['necrotici', 'veleno'],
    vulnerabilities: ['fuoco'],
    saves: { con: 8, int: 5, wis: 9, cha: 8 },
    legendary: {
      uses: 3,
      actions: [save('Polvere accecante', 'con', 16, undefined, undefined, 'Le creature entro 1,5 m: Accecato fino alla fine del loro turno successivo.'), save('Parola blasfema', 'con', 16, undefined, undefined, 'Stordito fino alla fine del suo prossimo turno.', 2), hit('Pugno putrescente', 9, '3d6+4', 'contundenti', 'Più 6d6 necrotici.', 2)],
    },
    lair: [other('Sabbie', 'Una creatura entro 18 m: TS Des CD 16 o Trattenuta dalla sabbia.'), other('Spiriti', 'I non morti nella tana hanno vantaggio ai TS fino al prossimo 20.')],
  },
  aboleth: {
    saves: { con: 6, int: 8, wis: 6 },
    legendary: {
      uses: 3,
      actions: [hit('Tentacolo', 9, '2d6+5', 'contundenti'), hit('Colpo di coda', 9, '3d6+5', 'contundenti'), other('Risucchio psichico', 'Una creatura Affascinata dall’aboleth subisce 3d6 psichici; l’aboleth si cura dello stesso ammontare.', 2)],
    },
    lair: [other('Getto d’acqua', 'Una creatura in acqua entro 27 m: TS For CD 14 o trascinata di 6 m.'), other('Illusione', 'Una creatura entro 27 m vede illusioni fino al prossimo 20.')],
  },
  kraken: {
    immunities: ['freddo', 'fulmine'],
    saves: { str: 17, dex: 7, con: 14, int: 13, wis: 11 },
    legendary: {
      uses: 3,
      actions: [hit('Tentacolo', 17, '3d8+10', 'contundenti', 'Afferrato e Trattenuto.'), save('Fulmine', 'dex', 23, '6d10', 'fulmine', 'Un bersaglio entro 36 m; metà se supera.', 2), other('Nube d’inchiostro', 'In acqua, una nube di 18 m di raggio oscura la vista.', 3)],
    },
  },
  tarrasque: {
    immunities: ['fuoco', 'veleno'],
    saves: { int: 5, wis: 9, cha: 9 },
    legendary: {
      uses: 3,
      actions: [other('Avanzare', 'Si muove fino a metà velocità.'), hit('Attacco', 19, '3d8+10', 'taglienti', 'Artigli o coda.'), save('Ruggito', 'wis', 17, undefined, undefined, 'Le creature entro 36 m: Spaventate fino alla fine del suo prossimo turno.', 2)],
    },
  },
};
