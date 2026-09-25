/**
 * More creatures from the System Reference Document (CC-BY-4.0), simplified
 * for the table: key traits and actions, speeds in metres.
 */

import type { Ability } from './data';
import type { MonsterAction, MonsterDef } from './monsters';

const A = (str: number, dex: number, con: number, int: number, wis: number, cha: number): Record<Ability, number> => ({ str, dex, con, int, wis, cha });
const T = (name: string, description: string) => ({ name, description });
const hit = (name: string, attack: number, damage: string, damageType: string, reach = '1,5 m', description?: string): MonsterAction => ({
  name,
  attack,
  damage,
  damageType,
  reach,
  ...(description ? { description } : {}),
});
const save = (name: string, ability: Ability, dc: number, damage: string | undefined, damageType: string | undefined, reach: string, description?: string, recharge?: string): MonsterAction => ({
  name,
  save: { ability, dc },
  ...(damage ? { damage } : {}),
  ...(damageType ? { damageType } : {}),
  reach,
  ...(description ? { description } : {}),
  ...(recharge ? { recharge } : {}),
});
const multi = (text: string) => T('Multiattacco', text);

export const MORE_MONSTERS: MonsterDef[] = [
  // ---------- GS 0 – 1/4 ----------
  {
    id: 'cat', name: 'Gatto', size: 'Minuscola', type: 'Bestia', ac: 12, hp: { average: 2, dice: '1d4' }, speed: '12 m, scalare 12 m',
    abilities: A(3, 15, 10, 3, 12, 7), cr: '0', xp: 10, senses: 'Scurovisione 18 m',
    actions: [hit('Artigli', 4, '1', 'taglienti')],
  },
  {
    id: 'rat', name: 'Ratto', size: 'Minuscola', type: 'Bestia', ac: 10, hp: { average: 1, dice: '1d4-1' }, speed: '6 m, scalare 6 m',
    abilities: A(2, 11, 9, 2, 10, 4), cr: '0', xp: 10, senses: 'Scurovisione 9 m',
    actions: [hit('Morso', 2, '1', 'perforanti')],
  },
  {
    id: 'stirge', name: 'Stige', size: 'Minuscola', type: 'Mostruosità', ac: 13, hp: { average: 5, dice: '2d4' }, speed: '3 m, volare 12 m',
    abilities: A(4, 16, 11, 2, 8, 6), cr: '1/8', xp: 25, senses: 'Scurovisione 18 m',
    actions: [hit('Proboscide', 5, '1d4+3', 'perforanti', '1,5 m', 'Si attacca al bersaglio e ogni suo turno gli succhia 2d4 PF (necrotici) finché non si stacca o il bersaglio perde 10 PF.')],
  },
  {
    id: 'mastiff', name: 'Mastino', size: 'Media', type: 'Bestia', ac: 12, hp: { average: 5, dice: '1d8+1' }, speed: '12 m',
    abilities: A(13, 14, 12, 3, 12, 7), cr: '1/8', xp: 25, senses: 'Scurovisione 18 m',
    actions: [hit('Morso', 3, '1d6+1', 'perforanti', '1,5 m', 'Se il bersaglio è Grande o più piccolo cade Prono.')],
  },
  {
    id: 'poisonousSnake', name: 'Serpente velenoso', size: 'Minuscola', type: 'Bestia', ac: 13, hp: { average: 2, dice: '1d4' }, speed: '9 m, nuotare 9 m',
    abilities: A(2, 16, 11, 1, 10, 3), cr: '1/8', xp: 25, senses: 'Vista cieca 3 m',
    actions: [hit('Morso', 5, '1d4+3', 'perforanti', '1,5 m', 'Più 1d6 danni da veleno.')],
  },
  {
    id: 'twigBlight', name: 'Rovo animato', size: 'Piccola', type: 'Vegetale', ac: 13, hp: { average: 7, dice: '2d6' }, speed: '6 m',
    abilities: A(6, 13, 12, 4, 8, 3), cr: '1/8', xp: 25, senses: 'Vista cieca 18 m',
    traits: [T('Vulnerabile al fuoco', 'Subisce danni doppi dal fuoco.')],
    actions: [hit('Artigli', 3, '1d4+1', 'perforanti')],
  },
  {
    id: 'boar', name: 'Cinghiale', size: 'Media', type: 'Bestia', ac: 11, hp: { average: 13, dice: '2d8+4' }, speed: '12 m',
    abilities: A(13, 11, 14, 2, 9, 5), cr: '1/4', xp: 50,
    traits: [T('Carica', 'Se si muove di almeno 6 m in linea retta e colpisce, +1d6 danni e il bersaglio cade Prono (TS For CD 11).'), T('Duro a morire', 'Una volta per riposo lungo, se scende a 0 PF resta a 1 PF.')],
    actions: [hit('Zanne', 3, '1d6+1', 'taglienti')],
  },
  {
    id: 'flyingSword', name: 'Spada volante', size: 'Piccola', type: 'Costrutto', ac: 17, hp: { average: 14, dice: '4d6' }, speed: '1,5 m, volare 15 m (fluttuare)',
    abilities: A(12, 15, 11, 1, 5, 1), cr: '1/4', xp: 50, senses: 'Vista cieca 18 m',
    traits: [T('Costrutto', 'Immune a veleno e psichici; immune ad Affascinato, Assordato, Spaventato, Paralizzato, Avvelenato.')],
    actions: [hit('Fendente', 4, '1d8+2', 'taglienti')],
  },
  {
    id: 'panther', name: 'Pantera', size: 'Media', type: 'Bestia', ac: 13, hp: { average: 13, dice: '3d8' }, speed: '15 m, scalare 12 m',
    abilities: A(14, 16, 10, 3, 14, 7), cr: '1/4', xp: 50, senses: 'Scurovisione 18 m',
    traits: [T('Balzo', 'Se si muove di 6 m verso un bersaglio e lo artiglia, questo cade Prono (TS For CD 12); poi può mordere come azione bonus.')],
    actions: [hit('Artigli', 5, '1d4+3', 'taglienti'), hit('Morso', 5, '1d6+3', 'perforanti')],
  },
  {
    id: 'pseudodragon', name: 'Pseudodrago', size: 'Minuscola', type: 'Drago', ac: 14, hp: { average: 10, dice: '3d4+3' }, speed: '4,5 m, volare 18 m',
    abilities: A(6, 15, 13, 10, 12, 10), cr: '1/4', xp: 50, senses: 'Vista cieca 3 m, scurovisione 18 m',
    traits: [T('Resistenza alla magia', 'Vantaggio ai TS contro incantesimi.')],
    actions: [hit('Morso', 4, '1d4+2', 'perforanti'), save('Pungiglione', 'con', 12, '2d4', 'veleno', '1,5 m', 'Se fallisce di 5 o più resta Avvelenato e privo di sensi per 1 ora.')],
  },
  {
    id: 'acolyte', name: 'Accolito', size: 'Media', type: 'Umanoide', ac: 13, hp: { average: 11, dice: '2d8+2' }, speed: '9 m',
    abilities: A(10, 10, 12, 10, 14, 11), cr: '1/4', xp: 50,
    traits: [T('Incantesimi', 'Luce, Taumaturgia; 3/giorno Benedizione, Cura ferite.')],
    actions: [hit('Mazza', 2, '1d6', 'contundenti', '1,5 m', 'Più 1d4 danni radiosi.'), hit('Fiamma sacra', 4, '1d8', 'radiosi', '18 m', 'TS Des CD 12 invece del tiro per colpire.')],
  },

  // ---------- GS 1/2 ----------
  {
    id: 'hobgoblinWarrior', name: 'Guerriero hobgoblin', size: 'Media', type: 'Folletto (goblinoide)', ac: 18, hp: { average: 11, dice: '2d8+2' }, speed: '9 m',
    abilities: A(13, 12, 12, 10, 10, 9), cr: '1/2', xp: 100, senses: 'Scurovisione 18 m',
    traits: [T('Vantaggio tattico', 'Una volta per turno +2d6 danni se un alleato è entro 1,5 m dal bersaglio.')],
    actions: [hit('Spada lunga', 3, '2d10+1', 'taglienti', '1,5 m', 'A due mani.'), hit('Arco lungo', 3, '1d8+1', 'perforanti', '45/180 m')],
  },
  {
    id: 'gnollWarrior', name: 'Guerriero gnoll', size: 'Media', type: 'Demone', ac: 15, hp: { average: 27, dice: '6d8' }, speed: '9 m',
    abilities: A(14, 12, 11, 6, 10, 7), cr: '1/2', xp: 100, senses: 'Scurovisione 18 m',
    traits: [T('Furia', 'Quando porta una creatura a 0 PF può muoversi di metà velocità e mordere come azione bonus.')],
    actions: [hit('Lancia', 4, '1d6+2', 'perforanti', '1,5 m o 6/18 m'), hit('Morso', 4, '1d4+2', 'perforanti')],
  },
  {
    id: 'shadow', name: 'Ombra', size: 'Media', type: 'Non morto', ac: 12, hp: { average: 16, dice: '3d8+3' }, speed: '12 m',
    abilities: A(6, 14, 13, 6, 10, 8), cr: '1/2', xp: 100, senses: 'Scurovisione 18 m',
    traits: [T('Amorfa', 'Passa attraverso spazi di 2,5 cm.'), T('Furtività nell’ombra', 'In penombra o oscurità si Nasconde come azione bonus.'), T('Debolezza alla luce', 'Svantaggio a prove e attacchi alla luce del sole.')],
    actions: [hit('Tocco risucchiante', 4, '2d6+2', 'necrotici', '1,5 m', 'La Forza del bersaglio cala di 1d4; a 0 muore e diventa un’ombra.')],
  },
  {
    id: 'worg', name: 'Worg', size: 'Grande', type: 'Folletto', ac: 13, hp: { average: 26, dice: '4d10+4' }, speed: '15 m',
    abilities: A(16, 13, 13, 7, 11, 8), cr: '1/2', xp: 100, senses: 'Scurovisione 18 m',
    actions: [hit('Morso', 5, '1d10+3', 'perforanti', '1,5 m', 'Il bersaglio cade Prono (TS For CD 13) se Grande o più piccolo.')],
  },
  {
    id: 'blackBear', name: 'Orso nero', size: 'Media', type: 'Bestia', ac: 11, hp: { average: 19, dice: '3d8+6' }, speed: '12 m, scalare 9 m, nuotare 9 m',
    abilities: A(15, 12, 14, 2, 12, 7), cr: '1/2', xp: 100, senses: 'Scurovisione 18 m',
    traits: [multi('Un morso e un attacco con gli artigli.')],
    actions: [hit('Morso', 4, '1d6+2', 'perforanti'), hit('Artigli', 4, '1d4+2', 'taglienti')],
  },
  {
    id: 'crocodile', name: 'Coccodrillo', size: 'Grande', type: 'Bestia', ac: 12, hp: { average: 13, dice: '2d10+2' }, speed: '6 m, nuotare 9 m',
    abilities: A(15, 10, 13, 2, 10, 5), cr: '1/2', xp: 100,
    traits: [T('Trattenere il fiato', 'Resiste 1 ora sott’acqua.')],
    actions: [hit('Morso', 4, '1d8+2', 'perforanti', '1,5 m', 'Il bersaglio è Afferrato (fuga CD 12).')],
  },
  {
    id: 'satyr', name: 'Satiro', size: 'Media', type: 'Folletto', ac: 13, hp: { average: 31, dice: '7d8' }, speed: '12 m',
    abilities: A(12, 16, 11, 12, 10, 14), cr: '1/2', xp: 100,
    traits: [T('Resistenza alla magia', 'Vantaggio ai TS contro incantesimi.')],
    actions: [hit('Testata', 5, '1d4+3', 'contundenti'), hit('Arco corto', 5, '1d6+3', 'perforanti', '24/96 m'), save('Melodia seducente', 'wis', 12, undefined, undefined, '18 m', 'Affascinato o Spaventato finché il satiro suona.')],
  },
  {
    id: 'grayOoze', name: 'Melma grigia', size: 'Media', type: 'Melma', ac: 9, hp: { average: 22, dice: '3d8+9' }, speed: '3 m, scalare 3 m',
    abilities: A(12, 6, 16, 1, 6, 2), cr: '1/2', xp: 100, senses: 'Vista cieca 18 m',
    traits: [T('Amorfa', 'Passa attraverso spazi di 2,5 cm.'), T('Corrode il metallo', 'Le armi di metallo che la colpiscono subiscono −1 permanente ai danni.')],
    actions: [hit('Pseudopodo', 3, '1d6+1', 'contundenti', '1,5 m', 'Più 2d6 danni da acido; corrode armature di metallo (−1 CA).')],
  },
  {
    id: 'swarmInsects', name: 'Sciame di insetti', size: 'Media', type: 'Bestia (sciame)', ac: 11, hp: { average: 19, dice: '5d8-3' }, speed: '6 m, scalare 6 m, volare 6 m',
    abilities: A(3, 13, 10, 1, 7, 1), cr: '1/2', xp: 100, senses: 'Vista cieca 3 m',
    traits: [T('Sciame', 'Occupa lo spazio di altre creature; resistenza a contundenti, perforanti, taglienti.')],
    actions: [hit('Morsi', 3, '2d4', 'perforanti', '0 m', 'Metà danni se lo sciame ha metà PF o meno.')],
  },
  {
    id: 'warhorse', name: 'Cavallo da guerra', size: 'Grande', type: 'Bestia', ac: 11, hp: { average: 19, dice: '3d10+3' }, speed: '18 m',
    abilities: A(18, 12, 13, 2, 12, 7), cr: '1/2', xp: 100,
    actions: [hit('Zoccoli', 6, '2d4+4', 'contundenti', '1,5 m', 'Dopo 6 m di carica il bersaglio cade Prono (TS For CD 14).')],
  },

  // ---------- GS 1 ----------
  {
    id: 'bugbearWarrior', name: 'Guerriero bugbear', size: 'Media', type: 'Folletto (goblinoide)', ac: 14, hp: { average: 33, dice: '6d8+6' }, speed: '9 m',
    abilities: A(15, 14, 13, 8, 11, 9), cr: '1', xp: 200, senses: 'Scurovisione 18 m',
    traits: [T('Braccia lunghe', 'Portata +1,5 m con le armi da mischia.'), T('Attacco a sorpresa', '+2d6 danni al primo colpo contro una creatura sorpresa.')],
    actions: [hit('Morning star', 4, '2d8+2', 'perforanti', '3 m'), hit('Giavellotto', 4, '1d6+2', 'perforanti', '9/36 m')],
  },
  {
    id: 'animatedArmor', name: 'Armatura animata', size: 'Media', type: 'Costrutto', ac: 18, hp: { average: 33, dice: '6d8+6' }, speed: '7,5 m',
    abilities: A(14, 11, 13, 1, 3, 1), cr: '1', xp: 200, senses: 'Vista cieca 18 m',
    traits: [multi('Due schianti.'), T('Costrutto', 'Immune a veleno e psichici e a molte condizioni.')],
    actions: [hit('Schianto', 4, '1d6+2', 'contundenti')],
  },
  {
    id: 'deathDog', name: 'Cane della morte', size: 'Media', type: 'Mostruosità', ac: 12, hp: { average: 39, dice: '6d8+12' }, speed: '12 m',
    abilities: A(15, 14, 14, 3, 13, 6), cr: '1', xp: 200, senses: 'Scurovisione 36 m',
    traits: [multi('Due morsi.'), T('Due teste', 'Vantaggio a Percezione e ai TS contro Accecato, Affascinato, Assordato, Stordito, privo di sensi.')],
    actions: [hit('Morso', 4, '1d6+2', 'perforanti', '1,5 m', 'TS Cos CD 12 o malattia: −1d10 ai PF massimi ogni 24 ore.')],
  },
  {
    id: 'giantEagle', name: 'Aquila gigante', size: 'Grande', type: 'Celestiale', ac: 13, hp: { average: 26, dice: '4d10+4' }, speed: '3 m, volare 24 m',
    abilities: A(16, 17, 13, 8, 14, 10), cr: '1', xp: 200,
    traits: [multi('Due attacchi con gli artigli.'), T('Vista acuta', 'Vantaggio alle prove di Percezione basate sulla vista.')],
    actions: [hit('Artigli', 5, '1d6+3', 'taglienti')],
  },
  {
    id: 'imp', name: 'Imp', size: 'Minuscola', type: 'Immondo (diavolo)', ac: 13, hp: { average: 21, dice: '6d4+6' }, speed: '6 m, volare 12 m',
    abilities: A(6, 17, 13, 11, 12, 14), cr: '1', xp: 200, senses: 'Scurovisione 36 m (vede nell’oscurità magica)',
    traits: [T('Resistenza alla magia', 'Vantaggio ai TS contro incantesimi.'), T('Forma alterata', 'Può trasformarsi in ratto, corvo o ragno.'), T('Invisibilità', 'Diventa Invisibile a volontà.')],
    actions: [hit('Pungiglione', 5, '1d6+3', 'perforanti', '1,5 m', 'Più 2d6 danni da veleno.')],
  },
  {
    id: 'quasit', name: 'Quasit', size: 'Minuscola', type: 'Immondo (demone)', ac: 13, hp: { average: 25, dice: '10d4' }, speed: '12 m',
    abilities: A(5, 17, 10, 7, 10, 10), cr: '1', xp: 200, senses: 'Scurovisione 36 m',
    traits: [T('Resistenza alla magia', 'Vantaggio ai TS contro incantesimi.'), T('Invisibilità', 'Diventa Invisibile a volontà.')],
    actions: [hit('Artigli', 5, '1d4+3', 'taglienti', '1,5 m', 'TS Cos CD 10 o Avvelenato per 1 minuto.'), save('Spavento', 'wis', 10, undefined, undefined, '6 m', 'Spaventato per 1 minuto.')],
  },
  {
    id: 'specter', name: 'Spettro minore', size: 'Media', type: 'Non morto', ac: 12, hp: { average: 22, dice: '5d8' }, speed: '0 m, volare 15 m (fluttuare)',
    abilities: A(1, 14, 11, 10, 10, 11), cr: '1', xp: 200, senses: 'Scurovisione 18 m',
    traits: [T('Incorporeo', 'Attraversa creature e oggetti; resistenza a molti danni.'), T('Debolezza alla luce', 'Svantaggio alla luce del sole.')],
    actions: [hit('Tocco risucchiante', 4, '3d6', 'necrotici', '1,5 m', 'TS Cos CD 10 o i PF massimi calano dello stesso ammontare.')],
  },
  {
    id: 'lion', name: 'Leone', size: 'Grande', type: 'Bestia', ac: 12, hp: { average: 22, dice: '4d10' }, speed: '15 m',
    abilities: A(17, 15, 11, 3, 12, 8), cr: '1', xp: 200, senses: 'Scurovisione 18 m',
    traits: [multi('Due attacchi con gli artigli.'), T('Tattiche di branco', 'Vantaggio se un alleato è entro 1,5 m dal bersaglio.'), T('Ruggito', '1/giorno: Spaventati entro 4,5 m (TS Sag CD 11).')],
    actions: [hit('Artigli', 5, '1d8+3', 'taglienti')],
  },
  {
    id: 'dryad', name: 'Driade', size: 'Media', type: 'Folletto', ac: 16, hp: { average: 22, dice: '5d8' }, speed: '9 m, scalare 9 m',
    abilities: A(10, 12, 11, 14, 15, 18), cr: '1', xp: 200, senses: 'Scurovisione 18 m',
    traits: [T('Passo arboreo', 'Entra in un albero ed esce da un altro entro 18 m.'), T('Incantesimi', 'Charme, Intralciare, Pelle di corteccia, Parlare con gli animali.')],
    actions: [hit('Frusta di rovi', 6, '1d4+4', 'taglienti', '3 m')],
  },
  {
    id: 'spy', name: 'Spia', size: 'Media', type: 'Umanoide', ac: 12, hp: { average: 27, dice: '6d8' }, speed: '9 m',
    abilities: A(10, 15, 10, 12, 14, 16), cr: '1', xp: 200,
    traits: [multi('Due attacchi con la spada corta.'), T('Azione scaltra', 'Scatto, Disimpegno o Nascondersi come azione bonus.'), T('Attacco furtivo', '+2d6 una volta per turno con Vantaggio o alleato vicino.')],
    actions: [hit('Spada corta', 4, '1d6+2', 'perforanti'), hit('Balestra a mano', 4, '1d6+2', 'perforanti', '9/36 m')],
  },

  // ---------- GS 2 ----------
  {
    id: 'banditCaptain', name: 'Capitano dei banditi', size: 'Media', type: 'Umanoide', ac: 15, hp: { average: 52, dice: '8d8+16' }, speed: '9 m',
    abilities: A(15, 16, 14, 14, 11, 14), cr: '2', xp: 450,
    traits: [multi('Due attacchi con la scimitarra e uno col pugnale.'), T('Parata', 'Reazione: +2 CA contro un attacco in mischia.')],
    actions: [hit('Scimitarra', 5, '1d6+3', 'taglienti'), hit('Pugnale', 5, '1d4+3', 'perforanti', '1,5 m o 6/18 m')],
  },
  {
    id: 'berserker', name: 'Berserker', size: 'Media', type: 'Umanoide', ac: 13, hp: { average: 67, dice: '9d8+27' }, speed: '9 m',
    abilities: A(16, 12, 17, 9, 11, 9), cr: '2', xp: 450,
    traits: [T('Sconsiderato', 'Vantaggio agli attacchi; gli attacchi contro di lui hanno Vantaggio.')],
    actions: [hit('Ascia bipenne', 5, '1d12+3', 'taglienti')],
  },
  {
    id: 'gargoyle', name: 'Gargoyle', size: 'Media', type: 'Elementale', ac: 15, hp: { average: 67, dice: '9d8+27' }, speed: '9 m, volare 18 m',
    abilities: A(15, 11, 16, 6, 11, 7), cr: '2', xp: 450, senses: 'Scurovisione 18 m',
    traits: [multi('Due artigli.'), T('Aspetto di pietra', 'Immobile, è indistinguibile da una statua.'), T('Resistenze', 'Contundenti, perforanti e taglienti non magici.')],
    actions: [hit('Artigli', 4, '1d6+2', 'taglienti')],
  },
  {
    id: 'griffon', name: 'Grifone', size: 'Grande', type: 'Mostruosità', ac: 12, hp: { average: 59, dice: '7d10+21' }, speed: '9 m, volare 24 m',
    abilities: A(18, 15, 16, 2, 13, 8), cr: '2', xp: 450, senses: 'Scurovisione 18 m',
    traits: [multi('Due attacchi con gli artigli.')],
    actions: [hit('Artigli', 6, '1d8+4', 'taglienti', '1,5 m', 'Il bersaglio Medio o più piccolo è Afferrato (fuga CD 14).')],
  },
  {
    id: 'ghast', name: 'Ghast', size: 'Media', type: 'Non morto', ac: 13, hp: { average: 36, dice: '8d8' }, speed: '9 m',
    abilities: A(16, 17, 10, 11, 10, 8), cr: '2', xp: 450, senses: 'Scurovisione 18 m',
    traits: [T('Fetore', 'Chi inizia il turno entro 1,5 m: TS Cos CD 10 o Avvelenato fino al suo turno successivo.')],
    actions: [hit('Artigli', 5, '2d6+3', 'taglienti', '1,5 m', 'Non elfi: TS Cos CD 10 o Paralizzati per 1 minuto.'), hit('Morso', 3, '2d8+3', 'perforanti')],
  },
  {
    id: 'polarBear', name: 'Orso polare', size: 'Grande', type: 'Bestia', ac: 12, hp: { average: 42, dice: '5d10+15' }, speed: '12 m, nuotare 12 m',
    abilities: A(20, 10, 16, 2, 13, 7), cr: '2', xp: 450, senses: 'Scurovisione 18 m',
    traits: [multi('Due attacchi con il dilaniare.')],
    actions: [hit('Dilaniare', 7, '1d8+5', 'taglienti')],
  },
  {
    id: 'gibberingMouther', name: 'Bocca gorgogliante', size: 'Media', type: 'Aberrazione', ac: 9, hp: { average: 52, dice: '7d8+21' }, speed: '3 m, nuotare 3 m',
    abilities: A(10, 8, 16, 3, 10, 6), cr: '2', xp: 450, senses: 'Scurovisione 18 m',
    traits: [T('Borbottio', 'Chi inizia il turno entro 6 m: TS Sag CD 10 o si muove a caso.'), T('Terreno aberrante', 'Il terreno entro 3 m è difficile.')],
    actions: [hit('Morsi', 2, '5d6', 'perforanti', '1,5 m', 'Il bersaglio cade Prono se Medio o più piccolo.'), save('Sputo accecante', 'dex', 13, undefined, undefined, '4,5 m', 'Accecati fino alla fine del turno successivo.', '5-6')],
  },
  {
    id: 'druid', name: 'Druido', size: 'Media', type: 'Umanoide', ac: 13, hp: { average: 44, dice: '8d8+8' }, speed: '9 m',
    abilities: A(10, 12, 13, 12, 15, 11), cr: '2', xp: 450,
    traits: [T('Incantesimi', 'Fiamma prodotta, Intralciare, Onda tonante, Pelle di corteccia, Parlare con gli animali, Crescita vegetale.')],
    actions: [hit('Bastone', 4, '1d6+2', 'contundenti'), hit('Frusta di spine', 4, '1d6+2', 'perforanti', '9 m', 'Tira il bersaglio di 3 m verso il druido.')],
  },
  {
    id: 'ochreJelly', name: 'Gelatina ocra', size: 'Grande', type: 'Melma', ac: 8, hp: { average: 45, dice: '6d10+12' }, speed: '3 m, scalare 3 m',
    abilities: A(15, 6, 16, 2, 6, 1), cr: '2', xp: 450, senses: 'Vista cieca 18 m',
    traits: [T('Divisione', 'Colpita da fulmine o taglienti (se ha almeno 10 PF) si divide in due gelatine.')],
    actions: [hit('Pseudopodo', 4, '2d6+2', 'contundenti', '1,5 m', 'Più 1d6 danni da acido.')],
  },
  {
    id: 'pegasus', name: 'Pegaso', size: 'Grande', type: 'Celestiale', ac: 12, hp: { average: 59, dice: '7d10+21' }, speed: '18 m, volare 27 m',
    abilities: A(18, 15, 16, 10, 15, 13), cr: '2', xp: 450,
    actions: [hit('Zoccoli', 6, '2d6+4', 'contundenti')],
  },
  {
    id: 'wererat', name: 'Wererat', size: 'Media', type: 'Mostruosità (mutaforma)', ac: 13, hp: { average: 60, dice: '11d8+11' }, speed: '9 m, scalare 9 m',
    abilities: A(10, 15, 12, 11, 10, 8), cr: '2', xp: 450, senses: 'Scurovisione 18 m',
    traits: [multi('Due attacchi.'), T('Mutaforma', 'Si trasforma in ratto o ibrido; licantropia col morso (TS Cos CD 11).')],
    actions: [hit('Morso', 4, '1d4+2', 'perforanti'), hit('Balestra a mano', 4, '1d6+2', 'perforanti', '9/36 m')],
  },

  // ---------- GS 3 ----------
  {
    id: 'doppelganger', name: 'Doppelganger', size: 'Media', type: 'Mostruosità (mutaforma)', ac: 14, hp: { average: 52, dice: '8d8+16' }, speed: '9 m',
    abilities: A(11, 18, 14, 11, 12, 14), cr: '3', xp: 700, senses: 'Scurovisione 18 m',
    traits: [multi('Due schianti.'), T('Mutaforma', 'Assume l’aspetto di qualunque umanoide visto.'), T('Leggere i pensieri', 'Legge i pensieri superficiali entro 18 m.')],
    actions: [hit('Schianto', 6, '1d6+4', 'contundenti', '1,5 m', '+3d6 se ha sorpreso il bersaglio.')],
  },
  {
    id: 'hellHound', name: 'Segugio infernale', size: 'Media', type: 'Immondo', ac: 15, hp: { average: 45, dice: '7d8+14' }, speed: '15 m',
    abilities: A(17, 12, 14, 6, 13, 6), cr: '3', xp: 700, senses: 'Scurovisione 18 m',
    traits: [T('Tattiche di branco', 'Vantaggio se un alleato è entro 1,5 m dal bersaglio.'), T('Immunità', 'Immune al fuoco.')],
    actions: [hit('Morso', 5, '1d8+3', 'perforanti', '1,5 m', 'Più 2d6 danni da fuoco.'), save('Soffio di fuoco', 'dex', 12, '6d6', 'fuoco', 'cono 4,5 m', 'Metà se supera.', '5-6')],
  },
  {
    id: 'werewolf', name: 'Lupo mannaro', size: 'Media', type: 'Mostruosità (mutaforma)', ac: 15, hp: { average: 71, dice: '11d8+22' }, speed: '9 m (12 m da lupo)',
    abilities: A(15, 13, 14, 10, 11, 10), cr: '3', xp: 700, senses: 'Scurovisione 18 m',
    traits: [multi('Due attacchi.'), T('Mutaforma', 'Lupo o ibrido; licantropia col morso (TS Cos CD 12).')],
    actions: [hit('Morso', 5, '1d8+3', 'perforanti'), hit('Artigli', 5, '2d4+3', 'taglienti'), hit('Arco lungo', 4, '1d8+2', 'perforanti', '45/180 m')],
  },
  {
    id: 'mummy', name: 'Mummia', size: 'Media', type: 'Non morto', ac: 11, hp: { average: 58, dice: '9d8+18' }, speed: '6 m',
    abilities: A(16, 8, 15, 6, 10, 12), cr: '3', xp: 700, senses: 'Scurovisione 18 m',
    traits: [multi('Sguardo terrificante e un pugno.'), T('Vulnerabile al fuoco', 'Subisce danni doppi dal fuoco.')],
    actions: [hit('Pugno putrescente', 5, '2d6+3', 'contundenti', '1,5 m', 'Più 3d6 necrotici; TS Cos CD 12 o maledetto dalla putrefazione della mummia.'), save('Sguardo terrificante', 'wis', 11, undefined, undefined, '18 m', 'Spaventato; se fallisce di 5 o più è Paralizzato.')],
  },
  {
    id: 'manticore', name: 'Manticora', size: 'Grande', type: 'Mostruosità', ac: 14, hp: { average: 68, dice: '8d10+24' }, speed: '9 m, volare 15 m',
    abilities: A(17, 16, 17, 7, 12, 8), cr: '3', xp: 700, senses: 'Scurovisione 18 m',
    traits: [multi('Tre attacchi: morso e artigli, o tre aculei.')],
    actions: [hit('Morso', 5, '1d8+3', 'perforanti'), hit('Artigli', 5, '1d6+3', 'taglienti'), hit('Aculeo della coda', 5, '1d8+3', 'perforanti', '30/60 m')],
  },
  {
    id: 'winterWolf', name: 'Lupo invernale', size: 'Grande', type: 'Mostruosità', ac: 13, hp: { average: 75, dice: '10d10+20' }, speed: '15 m',
    abilities: A(18, 13, 14, 7, 12, 8), cr: '3', xp: 700,
    traits: [T('Tattiche di branco', 'Vantaggio se un alleato è entro 1,5 m dal bersaglio.'), T('Immunità', 'Immune al freddo.')],
    actions: [hit('Morso', 6, '2d6+4', 'perforanti', '1,5 m', 'Prono se fallisce TS For CD 14.'), save('Soffio gelido', 'con', 12, '4d8', 'freddo', 'cono 4,5 m', 'Metà se supera.', '5-6')],
  },
  {
    id: 'phaseSpider', name: 'Ragno fase', size: 'Grande', type: 'Mostruosità', ac: 13, hp: { average: 32, dice: '5d10+5' }, speed: '9 m, scalare 9 m',
    abilities: A(15, 15, 12, 6, 10, 6), cr: '3', xp: 700, senses: 'Scurovisione 18 m',
    traits: [T('Passo etereo', 'Azione bonus: entra o esce dal Piano Etereo.')],
    actions: [hit('Morso', 4, '1d10+2', 'perforanti', '1,5 m', 'Più 4d8 da veleno (TS Cos CD 11 per metà); a 0 PF resta stabile ma Avvelenato e Paralizzato.')],
  },
  {
    id: 'hobgoblinCaptain', name: 'Capitano hobgoblin', size: 'Media', type: 'Folletto (goblinoide)', ac: 17, hp: { average: 58, dice: '9d8+18' }, speed: '9 m',
    abilities: A(15, 14, 14, 12, 10, 13), cr: '3', xp: 700, senses: 'Scurovisione 18 m',
    traits: [multi('Due attacchi con lo spadone.'), T('Aura di comando', 'Gli alleati entro 3 m hanno Vantaggio ai TS contro Affascinato e Spaventato.')],
    actions: [hit('Spadone', 4, '2d6+2', 'taglienti', '1,5 m', 'Più 1d6 danni da veleno.'), hit('Arco lungo', 4, '1d8+2', 'perforanti', '45/180 m')],
  },

  // ---------- GS 4 ----------
  {
    id: 'ettin', name: 'Ettin', size: 'Grande', type: 'Gigante', ac: 12, hp: { average: 85, dice: '10d10+30' }, speed: '12 m',
    abilities: A(21, 8, 17, 6, 10, 8), cr: '4', xp: 1100, senses: 'Scurovisione 18 m',
    traits: [multi('Un attacco con l’ascia e uno con la morning star.'), T('Due teste', 'Vantaggio a Percezione e contro Accecato, Affascinato, Assordato, Spaventato, Stordito.')],
    actions: [hit('Ascia da battaglia', 7, '2d8+5', 'taglienti'), hit('Morning star', 7, '2d8+5', 'perforanti')],
  },
  {
    id: 'ghost', name: 'Fantasma', size: 'Media', type: 'Non morto', ac: 11, hp: { average: 45, dice: '10d8' }, speed: '1,5 m, volare 12 m (fluttuare)',
    abilities: A(7, 13, 10, 10, 12, 17), cr: '4', xp: 1100, senses: 'Scurovisione 18 m',
    traits: [T('Incorporeo', 'Attraversa creature e oggetti; resistenza a molti danni.'), T('Visione eterea', 'Vede nel Piano Etereo.')],
    actions: [hit('Tocco avvizzente', 5, '3d8+3', 'necrotici'), save('Aspetto orripilante', 'wis', 13, undefined, undefined, '18 m', 'Spaventati per 1 minuto; se fallisce di 5 o più invecchia 1d4 × 10 anni.'), save('Possessione', 'cha', 13, undefined, undefined, '1,5 m', 'Il fantasma possiede il corpo dell’umanoide.', '6')],
  },
  {
    id: 'banshee', name: 'Banshee', size: 'Media', type: 'Non morto', ac: 12, hp: { average: 54, dice: '12d8' }, speed: '0 m, volare 12 m (fluttuare)',
    abilities: A(1, 14, 10, 12, 11, 17), cr: '4', xp: 1100, senses: 'Scurovisione 18 m',
    traits: [T('Incorporeo', 'Attraversa creature e oggetti.'), T('Percepire la vita', 'Sente le creature vive entro 8 km.')],
    actions: [hit('Tocco corruttore', 5, '3d6+2', 'necrotici'), save('Lamento', 'con', 13, '3d6', 'psichici', '9 m', '1/giorno. Chi fallisce scende a 0 PF; chi supera subisce 3d6.')],
  },
  {
    id: 'blackPudding', name: 'Budino nero', size: 'Grande', type: 'Melma', ac: 7, hp: { average: 68, dice: '8d10+24' }, speed: '6 m, scalare 6 m',
    abilities: A(16, 5, 16, 1, 6, 1), cr: '4', xp: 1100, senses: 'Vista cieca 18 m',
    traits: [T('Corrosivo', 'Il legno e il metallo che lo toccano si corrodono.'), T('Divisione', 'Colpito da fulmine o taglienti si divide in due.')],
    actions: [hit('Pseudopodo', 5, '1d6+3', 'contundenti', '1,5 m', 'Più 4d8 danni da acido.')],
  },
  {
    id: 'lamia', name: 'Lamia', size: 'Grande', type: 'Immondo', ac: 13, hp: { average: 97, dice: '13d10+26' }, speed: '9 m',
    abilities: A(16, 13, 15, 14, 15, 16), cr: '4', xp: 1100, senses: 'Scurovisione 18 m',
    traits: [multi('Due artigli e un tocco inebriante.'), T('Incantesimi', 'Camuffare se stesso, Charme, Immagine maggiore, Suggestione, Geas.')],
    actions: [hit('Artigli', 5, '2d8+3', 'taglienti'), save('Tocco inebriante', 'wis', 13, undefined, undefined, '1,5 m', 'Maledetto: Svantaggio ai TS su Saggezza.')],
  },
  {
    id: 'flameskull', name: 'Teschio fiammeggiante', size: 'Minuscola', type: 'Non morto', ac: 13, hp: { average: 40, dice: '9d4+18' }, speed: '0 m, volare 12 m (fluttuare)',
    abilities: A(1, 17, 14, 16, 10, 11), cr: '4', xp: 1100, senses: 'Scurovisione 18 m',
    traits: [T('Ringiovanimento', 'Se distrutto torna in 1 ora a meno che i resti non siano trattati con acqua santa.'), T('Incantesimi', 'Mano magica, Dardo incantato, Scudo, Sfocatura, Palla di fuoco.')],
    actions: [hit('Raggio di fuoco', 5, '3d6', 'fuoco', '9 m'), save('Palla di fuoco', 'dex', 13, '8d6', 'fuoco', 'sfera 6 m entro 45 m', 'Metà se supera.', '1/giorno')],
  },
  {
    id: 'succubus', name: 'Succube', size: 'Media', type: 'Immondo', ac: 15, hp: { average: 71, dice: '13d8+13' }, speed: '9 m, volare 18 m',
    abilities: A(8, 17, 13, 15, 12, 20), cr: '4', xp: 1100, senses: 'Scurovisione 18 m',
    traits: [T('Mutaforma', 'Assume la forma di un umanoide Medio o Piccolo.'), T('Telepatia', '18 m.')],
    actions: [hit('Tocco risucchiante', 7, '3d6+5', 'psichici'), save('Charme', 'wis', 15, undefined, undefined, '9 m', 'Affascinato per 24 ore.'), save('Bacio prosciugante', 'con', 15, '5d10+5', 'psichici', 'creatura affascinata', 'Metà se supera; riduce i PF massimi.')],
  },
  {
    id: 'couatl', name: 'Couatl', size: 'Media', type: 'Celestiale', ac: 19, hp: { average: 60, dice: '8d8+24' }, speed: '9 m, volare 27 m',
    abilities: A(16, 20, 17, 18, 20, 18), cr: '4', xp: 1100, senses: 'Vista pura 36 m',
    traits: [T('Mente schermata', 'Immune alla lettura del pensiero e alla divinazione.'), T('Incantesimi', 'Individuare il male e il bene, Cura ferite, Santuario, Scudo della fede, Sogno.')],
    actions: [hit('Morso', 8, '1d6+5', 'perforanti', '1,5 m', 'TS Cos CD 13 o Avvelenato e privo di sensi per 24 ore.'), hit('Stritolare', 6, '2d6+3', 'contundenti', '3 m', 'Afferrato e Trattenuto (fuga CD 15).')],
  },

  // ---------- GS 5 ----------
  {
    id: 'airElemental', name: 'Elementale dell’aria', size: 'Grande', type: 'Elementale', ac: 15, hp: { average: 90, dice: '12d10+24' }, speed: '0 m, volare 27 m (fluttuare)',
    abilities: A(14, 20, 14, 6, 10, 6), cr: '5', xp: 1800, senses: 'Scurovisione 18 m',
    traits: [multi('Due schianti.'), T('Forma d’aria', 'Entra nello spazio altrui e passa da fessure di 2,5 cm.')],
    actions: [hit('Schianto', 8, '2d8+5', 'tuono'), save('Turbine', 'str', 13, '3d8+2', 'tuono', 'creature nel suo spazio', 'Scagliate a 6 m e Prone.', '4-6')],
  },
  {
    id: 'earthElemental', name: 'Elementale della terra', size: 'Grande', type: 'Elementale', ac: 17, hp: { average: 147, dice: '14d10+70' }, speed: '9 m, scavare 9 m',
    abilities: A(20, 8, 20, 5, 10, 5), cr: '5', xp: 1800, senses: 'Scurovisione 18 m, percezione tellurica 18 m',
    traits: [multi('Due schianti.'), T('Scivolare nella terra', 'Scava nella roccia senza lasciare tracce.'), T('Mostro da assedio', 'Danni doppi a oggetti e strutture.')],
    actions: [hit('Schianto', 8, '2d8+5', 'tuono', '3 m')],
  },
  {
    id: 'fireElemental', name: 'Elementale del fuoco', size: 'Grande', type: 'Elementale', ac: 13, hp: { average: 93, dice: '11d10+33' }, speed: '15 m',
    abilities: A(10, 17, 16, 6, 10, 7), cr: '5', xp: 1800, senses: 'Scurovisione 18 m',
    traits: [multi('Due tocchi.'), T('Forma di fuoco', 'Chi lo tocca o lo colpisce in mischia subisce 1d10 danni da fuoco; incendia ciò che attraversa.'), T('Vulnerabile all’acqua', 'Subisce 1 danno da freddo per ogni 1,5 m d’acqua attraversati.')],
    actions: [hit('Tocco', 6, '2d6+3', 'fuoco', '1,5 m', 'Il bersaglio prende fuoco: 1d10 fuoco a inizio turno finché non si spegne.')],
  },
  {
    id: 'waterElemental', name: 'Elementale dell’acqua', size: 'Grande', type: 'Elementale', ac: 14, hp: { average: 114, dice: '12d10+48' }, speed: '9 m, nuotare 27 m',
    abilities: A(18, 14, 18, 5, 10, 8), cr: '5', xp: 1800, senses: 'Scurovisione 18 m',
    traits: [multi('Due schianti.'), T('Forma d’acqua', 'Entra nello spazio altrui e passa da fessure di 2,5 cm.')],
    actions: [hit('Schianto', 7, '2d8+4', 'contundenti'), save('Vortice', 'str', 15, '2d8+4', 'contundenti', 'creature nel suo spazio', 'Afferrate e Trattenute dentro l’elementale.', '4-6')],
  },
  {
    id: 'hillGiant', name: 'Gigante delle colline', size: 'Enorme', type: 'Gigante', ac: 13, hp: { average: 105, dice: '10d12+40' }, speed: '12 m',
    abilities: A(21, 8, 19, 5, 9, 6), cr: '5', xp: 1800,
    traits: [multi('Due attacchi con il randello.')],
    actions: [hit('Randello pesante', 8, '3d8+5', 'contundenti', '3 m'), hit('Macigno', 8, '3d10+5', 'contundenti', '18/72 m')],
  },
  {
    id: 'gorgon', name: 'Gorgone', size: 'Grande', type: 'Costrutto', ac: 19, hp: { average: 114, dice: '12d10+48' }, speed: '12 m',
    abilities: A(20, 11, 18, 2, 12, 7), cr: '5', xp: 1800, senses: 'Scurovisione 18 m',
    traits: [T('Carica travolgente', 'Dopo 6 m in linea retta il bersaglio cade Prono (TS For CD 16).')],
    actions: [hit('Incornata', 8, '2d12+5', 'perforanti'), save('Soffio pietrificante', 'con', 13, undefined, undefined, 'cono 9 m', 'Trattenuti e poi Pietrificati se falliscono di nuovo.', '5-6')],
  },
  {
    id: 'shamblingMound', name: 'Cumulo strisciante', size: 'Grande', type: 'Vegetale', ac: 15, hp: { average: 110, dice: '13d10+39' }, speed: '6 m, nuotare 6 m',
    abilities: A(18, 8, 16, 5, 10, 5), cr: '5', xp: 1800, senses: 'Vista cieca 18 m',
    traits: [multi('Due schianti; se entrambi colpiscono può inglobare.'), T('Assorbire il fulmine', 'I danni da fulmine lo curano.')],
    actions: [hit('Schianto', 7, '2d8+4', 'contundenti'), save('Inglobare', 'str', 14, '2d8+4', 'contundenti', 'creatura afferrata', 'Accecata, Trattenuta, non respira; danni ogni turno.')],
  },
  {
    id: 'otyugh', name: 'Otyugh', size: 'Grande', type: 'Aberrazione', ac: 14, hp: { average: 104, dice: '11d10+44' }, speed: '9 m',
    abilities: A(16, 11, 19, 6, 13, 6), cr: '5', xp: 1800, senses: 'Scurovisione 36 m',
    traits: [multi('Un morso e due tentacoli.'), T('Telepatia limitata', 'Trasmette immagini a creature entro 36 m.')],
    actions: [hit('Morso', 6, '2d8+3', 'perforanti', '1,5 m', 'TS Cos CD 15 o malattia.'), hit('Tentacolo', 6, '1d8+3', 'contundenti', '3 m', 'Più 1d8 perforanti; Afferrato (fuga CD 13).')],
  },
  {
    id: 'salamander', name: 'Salamandra', size: 'Grande', type: 'Elementale', ac: 15, hp: { average: 90, dice: '12d10+24' }, speed: '9 m',
    abilities: A(18, 14, 15, 11, 10, 12), cr: '5', xp: 1800, senses: 'Scurovisione 18 m',
    traits: [multi('Due attacchi.'), T('Corpo rovente', 'Chi la tocca o la colpisce in mischia subisce 2d6 danni da fuoco.'), T('Immunità', 'Immune al fuoco; vulnerabile al freddo.')],
    actions: [hit('Lancia', 7, '2d6+4', 'perforanti', '1,5 m', 'Più 1d6 danni da fuoco.'), hit('Coda', 7, '2d6+4', 'contundenti', '3 m', 'Più 2d6 fuoco; Afferrato e Trattenuto.')],
  },
  {
    id: 'umberHulk', name: 'Umber hulk', size: 'Grande', type: 'Mostruosità', ac: 18, hp: { average: 93, dice: '11d10+33' }, speed: '9 m, scavare 6 m',
    abilities: A(20, 13, 16, 9, 10, 10), cr: '5', xp: 1800, senses: 'Scurovisione 36 m, percezione tellurica 18 m',
    traits: [multi('Tre attacchi: due artigli e un morso.'), T('Sguardo confondente', 'Chi inizia il turno entro 9 m e lo vede: TS Car CD 15 o Confuso.')],
    actions: [hit('Artigli', 8, '1d8+5', 'taglienti'), hit('Mandibole', 8, '2d8+5', 'taglienti')],
  },
  {
    id: 'gladiator', name: 'Gladiatore', size: 'Media', type: 'Umanoide', ac: 16, hp: { average: 112, dice: '15d8+45' }, speed: '9 m',
    abilities: A(18, 15, 16, 10, 12, 15), cr: '5', xp: 1800,
    traits: [multi('Tre attacchi con la lancia.'), T('Coraggioso', 'Vantaggio ai TS contro Spaventato.'), T('Parata', 'Reazione: +3 CA contro un attacco in mischia.')],
    actions: [hit('Lancia', 7, '2d6+4', 'perforanti', '1,5 m o 6/18 m'), hit('Colpo di scudo', 7, '2d4+4', 'contundenti', '1,5 m', 'Prono se Medio o più piccolo (TS For CD 15).')],
  },
  {
    id: 'nightHag', name: 'Megera notturna', size: 'Media', type: 'Immondo', ac: 17, hp: { average: 112, dice: '15d8+45' }, speed: '9 m',
    abilities: A(18, 15, 16, 16, 14, 16), cr: '5', xp: 1800, senses: 'Scurovisione 36 m',
    traits: [T('Resistenza alla magia', 'Vantaggio ai TS contro incantesimi.'), T('Incantesimi', 'Individuare magia, Dardo incantato, Raggio di indebolimento, Spostamento planare, Sonno.')],
    actions: [hit('Artigli', 7, '2d8+4', 'taglienti'), save('Incubo', 'wis', 14, '3d10', 'psichici', 'creatura addormentata', 'Riduce i PF massimi; il bersaglio non trae beneficio dal riposo.')],
  },

  // ---------- GS 6 – 9 ----------
  {
    id: 'chimera', name: 'Chimera', size: 'Grande', type: 'Mostruosità', ac: 14, hp: { average: 114, dice: '12d10+48' }, speed: '9 m, volare 18 m',
    abilities: A(19, 11, 19, 3, 14, 10), cr: '6', xp: 2300, senses: 'Scurovisione 18 m',
    traits: [multi('Tre attacchi: morso, corna e artigli.')],
    actions: [hit('Morso', 7, '2d6+4', 'perforanti'), hit('Corna', 7, '1d12+4', 'contundenti'), hit('Artigli', 7, '2d6+4', 'taglienti'), save('Soffio di fuoco', 'dex', 15, '7d8', 'fuoco', 'cono 4,5 m', 'Metà se supera.', '5-6')],
  },
  {
    id: 'medusa', name: 'Medusa', size: 'Media', type: 'Mostruosità', ac: 15, hp: { average: 127, dice: '17d8+51' }, speed: '9 m',
    abilities: A(10, 15, 16, 12, 13, 15), cr: '6', xp: 2300, senses: 'Scurovisione 18 m',
    traits: [multi('Due attacchi.'), T('Sguardo pietrificante', 'Chi la guarda entro 9 m: TS Cos CD 14 o Trattenuto, poi Pietrificato.')],
    actions: [hit('Capelli di serpente', 6, '1d4+2', 'perforanti', '1,5 m', 'Più 4d6 danni da veleno.'), hit('Arco lungo', 5, '1d8+2', 'perforanti', '45/180 m', 'Più 2d6 danni da veleno.')],
  },
  {
    id: 'wyvern', name: 'Viverna', size: 'Grande', type: 'Drago', ac: 14, hp: { average: 127, dice: '15d10+45' }, speed: '6 m, volare 24 m',
    abilities: A(19, 10, 16, 5, 12, 6), cr: '6', xp: 2300, senses: 'Scurovisione 36 m',
    traits: [multi('Un morso e un pungiglione.')],
    actions: [hit('Morso', 7, '2d6+4', 'perforanti', '3 m'), hit('Pungiglione', 7, '2d6+4', 'perforanti', '3 m', 'Più 7d6 veleno (TS Cos CD 15 per metà).')],
  },
  {
    id: 'youngWhiteDragon', name: 'Giovane drago bianco', size: 'Grande', type: 'Drago', ac: 17, hp: { average: 133, dice: '14d10+56' }, speed: '12 m, scavare 6 m, volare 24 m, nuotare 12 m',
    abilities: A(18, 10, 18, 6, 11, 12), cr: '6', xp: 2300, senses: 'Vista cieca 9 m, scurovisione 36 m',
    traits: [multi('Tre attacchi con artigli e morso.'), T('Passo sul ghiaccio', 'Il ghiaccio non è terreno difficile per lui.')],
    actions: [hit('Morso', 7, '2d10+4', 'perforanti', '3 m', 'Più 1d8 danni da freddo.'), hit('Artigli', 7, '2d6+4', 'taglienti'), save('Soffio gelido', 'con', 15, '10d8', 'freddo', 'cono 9 m', 'Metà se supera.', '5-6')],
  },
  {
    id: 'stoneGiant', name: 'Gigante delle pietre', size: 'Enorme', type: 'Gigante', ac: 17, hp: { average: 126, dice: '11d12+55' }, speed: '12 m',
    abilities: A(23, 15, 20, 10, 12, 9), cr: '7', xp: 2900, senses: 'Scurovisione 18 m',
    traits: [multi('Due attacchi.'), T('Afferrare macigni', 'Reazione: può afferrare un macigno scagliato contro di lui (TS Des CD 10).')],
    actions: [hit('Randello di pietra', 9, '3d8+6', 'contundenti', '4,5 m'), hit('Macigno', 9, '4d10+6', 'contundenti', '18/72 m', 'Prono se fallisce TS For CD 17.')],
  },
  {
    id: 'youngBlackDragon', name: 'Giovane drago nero', size: 'Grande', type: 'Drago', ac: 18, hp: { average: 127, dice: '15d10+45' }, speed: '12 m, volare 24 m, nuotare 12 m',
    abilities: A(19, 14, 17, 12, 11, 15), cr: '7', xp: 2900, senses: 'Vista cieca 9 m, scurovisione 36 m',
    traits: [multi('Tre attacchi con artigli e morso.'), T('Anfibio', 'Respira aria e acqua.')],
    actions: [hit('Morso', 7, '2d10+4', 'perforanti', '3 m', 'Più 1d8 danni da acido.'), hit('Artigli', 7, '2d6+4', 'taglienti'), save('Soffio acido', 'dex', 14, '11d8', 'acido', 'linea 9 × 1,5 m', 'Metà se supera.', '5-6')],
  },
  {
    id: 'oni', name: 'Oni', size: 'Grande', type: 'Immondo', ac: 17, hp: { average: 119, dice: '14d10+42' }, speed: '9 m, volare 9 m (fluttuare)',
    abilities: A(19, 11, 16, 14, 12, 15), cr: '7', xp: 2900, senses: 'Scurovisione 18 m',
    traits: [multi('Due attacchi.'), T('Rigenerazione', 'Recupera 10 PF a inizio turno se ne ha almeno 1.'), T('Incantesimi', 'Oscurità, Invisibilità, Charme, Cono di freddo, Forma gassosa, Sonno.')],
    actions: [hit('Artigli', 7, '2d8+4', 'taglienti', '3 m', 'Più 2d6 danni necrotici.'), hit('Raggio di sventura', 5, '2d8+2', 'necrotici', '18 m')],
  },
  {
    id: 'frostGiant', name: 'Gigante del gelo', size: 'Enorme', type: 'Gigante', ac: 15, hp: { average: 149, dice: '13d12+65' }, speed: '12 m',
    abilities: A(23, 9, 21, 9, 10, 12), cr: '8', xp: 3900,
    traits: [multi('Due attacchi.'), T('Immunità', 'Immune al freddo.')],
    actions: [hit('Ascia gelida', 9, '2d12+6', 'taglienti', '3 m', 'Più 2d8 danni da freddo.'), hit('Macigno di ghiaccio', 9, '4d10+6', 'contundenti', '18/72 m', 'Più 2d6 danni da freddo.')],
  },
  {
    id: 'youngGreenDragon', name: 'Giovane drago verde', size: 'Grande', type: 'Drago', ac: 18, hp: { average: 136, dice: '16d10+48' }, speed: '12 m, volare 24 m, nuotare 12 m',
    abilities: A(19, 12, 17, 16, 13, 15), cr: '8', xp: 3900, senses: 'Vista cieca 9 m, scurovisione 36 m',
    traits: [multi('Tre attacchi con artigli e morso.'), T('Anfibio', 'Respira aria e acqua.')],
    actions: [hit('Morso', 7, '2d10+4', 'perforanti', '3 m', 'Più 2d6 danni da veleno.'), hit('Artigli', 7, '2d6+4', 'taglienti'), save('Soffio velenoso', 'con', 14, '12d6', 'veleno', 'cono 9 m', 'Metà se supera.', '5-6')],
  },
  {
    id: 'hydra', name: 'Idra', size: 'Enorme', type: 'Mostruosità', ac: 15, hp: { average: 184, dice: '16d12+80' }, speed: '9 m, nuotare 9 m',
    abilities: A(20, 12, 20, 2, 10, 7), cr: '8', xp: 3900, senses: 'Scurovisione 18 m',
    traits: [T('Teste multiple', 'Ha 5 teste; ogni 25 danni in un turno ne perde una, e a fine turno ne ricrescono due per ogni testa persa (non se ha subito fuoco).'), T('Reazioni', 'Una reazione extra per ogni testa oltre la prima.')],
    actions: [hit('Morso', 8, '1d10+5', 'perforanti', '3 m', 'Un morso per ogni testa.')],
  },
  {
    id: 'assassin', name: 'Assassino', size: 'Media', type: 'Umanoide', ac: 16, hp: { average: 97, dice: '15d8+30' }, speed: '9 m',
    abilities: A(11, 18, 14, 16, 11, 10), cr: '8', xp: 3900,
    traits: [multi('Tre attacchi.'), T('Attacco furtivo', '+4d6 una volta per turno con Vantaggio o alleato vicino.'), T('Eludere', 'Nessun danno se supera un TS su Des per metà.')],
    actions: [hit('Spada corta', 7, '1d6+4', 'perforanti', '1,5 m', 'Più 3d6 veleno (TS Cos CD 16 per metà) e Avvelenato.'), hit('Balestra leggera', 7, '1d8+4', 'perforanti', '24/96 m', 'Più 3d6 danni da veleno.')],
  },
  {
    id: 'fireGiant', name: 'Gigante del fuoco', size: 'Enorme', type: 'Gigante', ac: 18, hp: { average: 162, dice: '13d12+78' }, speed: '9 m',
    abilities: A(25, 9, 23, 10, 14, 13), cr: '9', xp: 5000,
    traits: [multi('Due attacchi.'), T('Immunità', 'Immune al fuoco.')],
    actions: [hit('Spadone infuocato', 11, '4d6+7', 'taglienti', '3 m', 'Più 3d6 danni da fuoco.'), hit('Macigno rovente', 11, '4d10+7', 'contundenti', '18/72 m', 'Più 3d6 danni da fuoco.')],
  },
  {
    id: 'cloudGiant', name: 'Gigante delle nuvole', size: 'Enorme', type: 'Gigante', ac: 14, hp: { average: 200, dice: '16d12+96' }, speed: '12 m, volare 6 m (fluttuare)',
    abilities: A(27, 10, 22, 12, 16, 16), cr: '9', xp: 5000,
    traits: [multi('Due attacchi.'), T('Incantesimi', 'Individuare magia, Luci danzanti, Nebbia, Volare, Forma gassosa, Controllare il tempo atmosferico.')],
    actions: [hit('Morning star tonante', 12, '3d8+8', 'contundenti', '3 m', 'Più 2d6 danni da tuono.'), hit('Fulmine', 12, '5d8', 'fulmine', '72 m')],
  },
  {
    id: 'youngBlueDragon', name: 'Giovane drago blu', size: 'Grande', type: 'Drago', ac: 18, hp: { average: 152, dice: '16d10+64' }, speed: '12 m, scavare 6 m, volare 24 m',
    abilities: A(21, 10, 19, 14, 13, 17), cr: '9', xp: 5000, senses: 'Vista cieca 9 m, scurovisione 36 m',
    traits: [multi('Tre attacchi con artigli e morso.')],
    actions: [hit('Morso', 9, '2d10+5', 'perforanti', '3 m', 'Più 1d10 danni da fulmine.'), hit('Artigli', 9, '2d6+5', 'taglienti'), save('Soffio di fulmine', 'dex', 16, '10d10', 'fulmine', 'linea 18 × 1,5 m', 'Metà se supera.', '5-6')],
  },
  {
    id: 'boneDevil', name: 'Diavolo delle ossa', size: 'Grande', type: 'Immondo (diavolo)', ac: 16, hp: { average: 161, dice: '17d10+68' }, speed: '12 m, volare 12 m',
    abilities: A(18, 16, 18, 13, 14, 16), cr: '9', xp: 5000, senses: 'Scurovisione 36 m (vede nell’oscurità magica)',
    traits: [multi('Due artigli e un pungiglione.'), T('Resistenza alla magia', 'Vantaggio ai TS contro incantesimi.')],
    actions: [hit('Artigli', 8, '1d8+4', 'taglienti', '3 m'), hit('Pungiglione', 8, '2d8+4', 'perforanti', '3 m', 'Più 5d6 veleno (TS Cos CD 14) e Avvelenato.')],
  },
  {
    id: 'treant', name: 'Treant', size: 'Enorme', type: 'Vegetale', ac: 16, hp: { average: 138, dice: '12d12+60' }, speed: '9 m',
    abilities: A(23, 8, 21, 12, 16, 12), cr: '9', xp: 5000,
    traits: [multi('Due schianti.'), T('Mostro da assedio', 'Danni doppi a oggetti e strutture.'), T('Animare alberi', 'Anima fino a due alberi entro 18 m.'), T('Vulnerabile al fuoco', 'Subisce danni doppi dal fuoco.')],
    actions: [hit('Schianto', 10, '3d6+6', 'contundenti', '1,5 m'), hit('Roccia', 10, '4d10+6', 'contundenti', '18/54 m')],
  },

  // ---------- GS 10+ ----------
  {
    id: 'stoneGolem', name: 'Golem di pietra', size: 'Grande', type: 'Costrutto', ac: 18, hp: { average: 178, dice: '17d10+85' }, speed: '9 m',
    abilities: A(22, 9, 20, 3, 11, 1), cr: '10', xp: 5900, senses: 'Scurovisione 36 m',
    traits: [multi('Due schianti.'), T('Resistenza alla magia', 'Vantaggio ai TS contro incantesimi.'), T('Forma immutabile', 'Immune agli effetti che cambiano la forma.')],
    actions: [hit('Schianto', 10, '3d8+6', 'contundenti'), save('Lentezza', 'wis', 17, undefined, undefined, '3 m', 'Come l’incantesimo Lentezza.', '5-6')],
  },
  {
    id: 'aboleth', name: 'Aboleth', size: 'Grande', type: 'Aberrazione', ac: 17, hp: { average: 150, dice: '20d10+40' }, speed: '3 m, nuotare 12 m',
    abilities: A(21, 9, 15, 18, 15, 18), cr: '10', xp: 5900, senses: 'Scurovisione 36 m',
    traits: [multi('Tre tentacoli.'), T('Resistenza leggendaria', '3 volte al giorno supera un TS fallito.'), T('Muco', 'Chi lo tocca: TS Cos CD 14 o può respirare solo sott’acqua.')],
    actions: [hit('Tentacolo', 9, '2d6+5', 'contundenti', '4,5 m', 'TS Cos CD 14 o malattia della pelle.'), save('Dominio', 'wis', 16, undefined, undefined, '9 m', 'Affascinato dall’aboleth.')],
  },
  {
    id: 'deva', name: 'Deva', size: 'Media', type: 'Celestiale (angelo)', ac: 17, hp: { average: 229, dice: '27d8+108' }, speed: '9 m, volare 27 m',
    abilities: A(18, 18, 18, 17, 20, 20), cr: '10', xp: 5900, senses: 'Vista pura 36 m',
    traits: [multi('Due attacchi.'), T('Resistenza alla magia', 'Vantaggio ai TS contro incantesimi.'), T('Tocco curativo', '3/giorno: cura 4d8+2 PF e rimuove maledizioni e veleni.')],
    actions: [hit('Mazza santa', 8, '1d6+4', 'contundenti', '1,5 m', 'Più 4d8 danni radiosi.')],
  },
  {
    id: 'behir', name: 'Behir', size: 'Enorme', type: 'Mostruosità', ac: 17, hp: { average: 168, dice: '16d12+64' }, speed: '15 m, scalare 12 m',
    abilities: A(23, 16, 18, 7, 14, 12), cr: '11', xp: 7200, senses: 'Scurovisione 27 m',
    traits: [multi('Un morso e una stretta.')],
    actions: [hit('Morso', 10, '3d10+6', 'perforanti', '3 m'), hit('Stretta', 10, '2d10+6', 'contundenti', '1,5 m', 'Più 2d10 taglienti; Afferrato e Trattenuto.'), save('Soffio di fulmine', 'dex', 16, '12d10', 'fulmine', 'linea 6 × 1,5 m', 'Metà se supera.', '5-6')],
  },
  {
    id: 'remorhaz', name: 'Remorhaz', size: 'Enorme', type: 'Mostruosità', ac: 17, hp: { average: 195, dice: '17d12+85' }, speed: '9 m, scavare 6 m',
    abilities: A(24, 13, 21, 4, 10, 5), cr: '11', xp: 7200, senses: 'Scurovisione 18 m, percezione tellurica 18 m',
    traits: [T('Corpo rovente', 'Chi lo tocca o lo colpisce in mischia subisce 3d6 danni da fuoco.')],
    actions: [hit('Morso', 11, '6d10+7', 'perforanti', '3 m', 'Più 3d6 fuoco; Afferrato e poi Inghiottito (6d6 acido per turno).')],
  },
  {
    id: 'djinni', name: 'Djinni', size: 'Grande', type: 'Elementale', ac: 17, hp: { average: 161, dice: '14d10+84' }, speed: '9 m, volare 27 m (fluttuare)',
    abilities: A(21, 15, 22, 15, 16, 20), cr: '11', xp: 7200, senses: 'Scurovisione 36 m',
    traits: [multi('Tre attacchi.'), T('Incantesimi', 'Creazione, Individuare magia, Invisibilità, Tempesta di fulmini, Spostamento planare, Desiderio (1 volta).')],
    actions: [hit('Scimitarra tempestosa', 9, '2d6+5', 'taglienti', '1,5 m', 'Più 2d6 fulmine o tuono.'), save('Turbine', 'str', 18, '3d8+5', 'tuono', 'cilindro 1,5 m', 'Trattenuti nel turbine.')],
  },
  {
    id: 'efreeti', name: 'Efreeti', size: 'Grande', type: 'Elementale', ac: 17, hp: { average: 200, dice: '16d10+112' }, speed: '12 m, volare 18 m',
    abilities: A(22, 12, 24, 16, 15, 16), cr: '11', xp: 7200, senses: 'Scurovisione 36 m',
    traits: [multi('Due scimitarre o due scagliare fiamme.'), T('Immunità', 'Immune al fuoco.')],
    actions: [hit('Scimitarra rovente', 10, '2d6+6', 'taglienti', '1,5 m', 'Più 2d6 danni da fuoco.'), hit('Scagliare fiamme', 7, '5d6', 'fuoco', '36 m')],
  },
  {
    id: 'roc', name: 'Roc', size: 'Mastodontica', type: 'Mostruosità', ac: 15, hp: { average: 248, dice: '16d20+80' }, speed: '6 m, volare 36 m',
    abilities: A(28, 10, 20, 3, 10, 9), cr: '11', xp: 7200,
    traits: [multi('Un becco e un attacco con gli artigli.')],
    actions: [hit('Becco', 13, '4d8+9', 'perforanti', '3 m'), hit('Artigli', 13, '4d6+9', 'taglienti', '1,5 m', 'Afferrato e Trattenuto (fuga CD 19).')],
  },
  {
    id: 'archmage', name: 'Arcimago', size: 'Media', type: 'Umanoide', ac: 17, hp: { average: 170, dice: '31d8+31' }, speed: '9 m',
    abilities: A(10, 14, 12, 20, 15, 16), cr: '12', xp: 8400,
    traits: [T('Resistenza alla magia', 'Vantaggio ai TS contro incantesimi.'), T('Incantesimi', 'Cono di freddo, Invisibilità superiore, Lampo, Muro di forza, Teletrasporto, Fermare il tempo, Mente vuota.')],
    actions: [hit('Esplosione arcana', 9, '4d10+5', 'forza', '45 m'), save('Palla di fuoco', 'dex', 17, '8d6', 'fuoco', 'sfera 6 m entro 45 m', 'Metà se supera.')],
  },
  {
    id: 'erinyes', name: 'Erinni', size: 'Media', type: 'Immondo (diavolo)', ac: 18, hp: { average: 178, dice: '21d8+84' }, speed: '9 m, volare 18 m',
    abilities: A(18, 16, 18, 14, 14, 18), cr: '12', xp: 8400, senses: 'Vista pura 36 m',
    traits: [multi('Tre attacchi.'), T('Resistenza alla magia', 'Vantaggio ai TS contro incantesimi.')],
    actions: [hit('Spada lunga', 8, '2d10+4', 'taglienti', '1,5 m', 'Più 3d8 danni da veleno.'), hit('Arco lungo', 7, '1d8+3', 'perforanti', '45/180 m', 'Più 3d8 veleno e Avvelenato.')],
  },
  {
    id: 'vampire', name: 'Vampiro', size: 'Media', type: 'Non morto', ac: 16, hp: { average: 195, dice: '23d8+92' }, speed: '12 m, scalare 12 m',
    abilities: A(18, 18, 18, 17, 15, 18), cr: '15', xp: 13000, senses: 'Scurovisione 36 m',
    traits: [multi('Tre attacchi.'), T('Resistenza leggendaria', '3 volte al giorno (4 nella tana).'), T('Rigenerazione', '20 PF a inizio turno se non in luce solare o acqua corrente.'), T('Debolezze', 'Luce solare, acqua corrente, paletto nel cuore, non entra senza invito.')],
    actions: [hit('Artiglio', 9, '1d8+4', 'taglienti', '1,5 m', 'Afferrato.'), hit('Morso', 9, '1d6+4', 'perforanti', '1,5 m', 'Più 3d6 necrotici; riduce i PF massimi, il vampiro si cura dello stesso ammontare.'), save('Charme', 'wis', 17, undefined, undefined, '9 m', 'Affascinato per 24 ore.')],
  },
  {
    id: 'mummyLord', name: 'Signore delle mummie', size: 'Media', type: 'Non morto', ac: 17, hp: { average: 187, dice: '25d8+75' }, speed: '9 m',
    abilities: A(18, 10, 17, 11, 19, 16), cr: '15', xp: 13000, senses: 'Vista pura 18 m',
    traits: [multi('Pugno e sguardo o incantesimo.'), T('Resistenza leggendaria', '3 volte al giorno.'), T('Ringiovanimento', 'Torna in 24 ore se il cuore non è distrutto.'), T('Incantesimi', 'Comando, Blocca persona, Dissolvi magie, Sciame di insetti, Ferire, Parola divina.')],
    actions: [hit('Pugno putrescente', 9, '3d6+4', 'contundenti', '1,5 m', 'Più 6d6 necrotici e maledizione.'), save('Sguardo terrificante', 'wis', 16, undefined, undefined, '18 m', 'Paralizzato fino alla fine del turno successivo.')],
  },
  {
    id: 'purpleWorm', name: 'Verme purpureo', size: 'Mastodontica', type: 'Mostruosità', ac: 18, hp: { average: 247, dice: '15d20+90' }, speed: '15 m, scavare 15 m',
    abilities: A(28, 7, 22, 1, 8, 4), cr: '15', xp: 13000, senses: 'Vista cieca 9 m, percezione tellurica 18 m',
    traits: [multi('Un morso e un pungiglione.')],
    actions: [hit('Morso', 14, '3d8+9', 'perforanti', '3 m', 'Grande o più piccolo: Inghiottito (6d6 acido per turno).'), hit('Pungiglione', 14, '3d6+9', 'perforanti', '3 m', 'Più 12d6 veleno (TS Cos CD 19 per metà).')],
  },
  {
    id: 'ironGolem', name: 'Golem di ferro', size: 'Grande', type: 'Costrutto', ac: 20, hp: { average: 210, dice: '20d10+100' }, speed: '9 m',
    abilities: A(24, 9, 20, 3, 11, 1), cr: '16', xp: 15000, senses: 'Scurovisione 36 m',
    traits: [multi('Due attacchi.'), T('Assorbire il fuoco', 'I danni da fuoco lo curano.'), T('Resistenza alla magia', 'Vantaggio ai TS contro incantesimi.')],
    actions: [hit('Schianto', 12, '3d8+7', 'contundenti', '1,5 m', 'Più 2d6 danni da fuoco.'), hit('Spada', 12, '3d10+7', 'taglienti', '3 m'), save('Soffio velenoso', 'con', 19, '10d8', 'veleno', 'cono 4,5 m', 'Metà se supera.', '6')],
  },
  {
    id: 'balor', name: 'Balor', size: 'Enorme', type: 'Immondo (demone)', ac: 19, hp: { average: 287, dice: '23d12+138' }, speed: '12 m, volare 24 m',
    abilities: A(26, 15, 22, 20, 16, 22), cr: '19', xp: 22000, senses: 'Vista pura 36 m',
    traits: [multi('Due attacchi.'), T('Aura di fuoco', 'Chi inizia il turno entro 1,5 m subisce 3d6 danni da fuoco.'), T('Agonia mortale', 'Quando muore esplode: 20d6 fuoco entro 9 m (TS Des CD 20).'), T('Resistenza alla magia', 'Vantaggio ai TS contro incantesimi.')],
    actions: [hit('Spada lunga fulminea', 14, '3d8+8', 'taglienti', '3 m', 'Più 4d8 danni da fulmine.'), hit('Frusta infuocata', 14, '2d6+8', 'taglienti', '9 m', 'Più 3d6 fuoco; tirato di 7,5 m verso il balor.')],
  },
  {
    id: 'pitFiend', name: 'Diavolo della fossa', size: 'Grande', type: 'Immondo (diavolo)', ac: 21, hp: { average: 337, dice: '27d10+189' }, speed: '9 m, volare 18 m',
    abilities: A(26, 14, 24, 22, 18, 24), cr: '20', xp: 25000, senses: 'Vista pura 36 m',
    traits: [multi('Quattro attacchi.'), T('Aura di paura', 'Nemici entro 6 m: TS Sag CD 21 o Spaventati.'), T('Resistenza leggendaria', '4 volte al giorno.'), T('Incantesimi', 'Palla di fuoco, Blocca mostri, Muro di fuoco.')],
    actions: [hit('Morso', 14, '4d6+8', 'perforanti', '1,5 m', 'Più 6d6 veleno e Avvelenato.'), hit('Artigli', 14, '2d8+8', 'taglienti', '3 m'), hit('Mazza', 14, '2d6+8', 'contundenti', '3 m', 'Più 6d6 danni da fuoco.')],
  },
  {
    id: 'lich', name: 'Lich', size: 'Media', type: 'Non morto', ac: 20, hp: { average: 315, dice: '42d8+126' }, speed: '9 m',
    abilities: A(11, 16, 16, 21, 16, 16), cr: '21', xp: 33000, senses: 'Vista pura 36 m',
    traits: [T('Resistenza leggendaria', '4 volte al giorno.'), T('Filatterio', 'Se distrutto torna in 1d10 giorni vicino al filatterio.'), T('Incantesimi', 'Dissolvi magie, Palla di fuoco, Invisibilità, Dito della morte, Parola del potere uccidere, Fermare il tempo.')],
    actions: [hit('Tocco paralizzante', 12, '3d6+5', 'freddo', '1,5 m', 'TS Cos CD 20 o Paralizzato per 1 minuto.'), hit('Raggio mortale', 12, '6d8+5', 'necrotici', '36 m')],
  },
  {
    id: 'ancientRedDragon', name: 'Drago rosso antico', size: 'Mastodontica', type: 'Drago', ac: 22, hp: { average: 507, dice: '26d20+234' }, speed: '12 m, scalare 12 m, volare 24 m',
    abilities: A(30, 10, 29, 18, 15, 27), cr: '24', xp: 62000, senses: 'Vista cieca 18 m, scurovisione 36 m',
    traits: [multi('Tre attacchi con artigli e morso.'), T('Resistenza leggendaria', '4 volte al giorno (5 nella tana).'), T('Immunità', 'Immune al fuoco.')],
    actions: [hit('Morso', 17, '2d10+10', 'perforanti', '4,5 m', 'Più 4d6 danni da fuoco.'), hit('Artigli', 17, '2d8+10', 'taglienti', '3 m'), save('Soffio di fuoco', 'dex', 24, '26d6', 'fuoco', 'cono 27 m', 'Metà se supera.', '5-6')],
  },
  {
    id: 'kraken', name: 'Kraken', size: 'Mastodontica', type: 'Mostruosità (titano)', ac: 18, hp: { average: 481, dice: '26d20+208' }, speed: '6 m, nuotare 36 m',
    abilities: A(30, 11, 26, 22, 18, 20), cr: '23', xp: 50000, senses: 'Vista pura 36 m',
    traits: [multi('Tre tentacoli.'), T('Resistenza leggendaria', '4 volte al giorno.'), T('Mostro da assedio', 'Danni doppi a oggetti e strutture.')],
    actions: [hit('Tentacolo', 17, '3d8+10', 'contundenti', '9 m', 'Afferrato e Trattenuto (fuga CD 20).'), save('Tempesta di fulmini', 'dex', 23, '6d10', 'fulmine', '36 m', 'Tre bersagli; metà se supera.')],
  },
  {
    id: 'tarrasque', name: 'Tarrasque', size: 'Mastodontica', type: 'Mostruosità (titano)', ac: 25, hp: { average: 697, dice: '34d20+340' }, speed: '18 m, scavare 12 m, scalare 12 m',
    abilities: A(30, 11, 30, 3, 11, 11), cr: '30', xp: 155000, senses: 'Vista cieca 36 m',
    traits: [multi('Cinque attacchi.'), T('Resistenza leggendaria', '6 volte al giorno.'), T('Carapace riflettente', 'I raggi e le linee magiche vengono riflessi con 1 su d6.'), T('Mostro da assedio', 'Danni doppi a oggetti e strutture.')],
    actions: [hit('Morso', 19, '4d12+10', 'perforanti', '3 m', 'Afferrato e poi Inghiottito (16d6 acido per turno).'), hit('Artigli', 19, '3d8+10', 'taglienti', '4,5 m'), hit('Coda', 19, '4d6+10', 'contundenti', '6 m', 'Prono (TS For CD 20).')],
  },
];
