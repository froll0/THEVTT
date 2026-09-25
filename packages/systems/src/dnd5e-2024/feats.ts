/** Feats from SRD 5.2. */

export type FeatCategory = 'origin' | 'general' | 'fightingStyle' | 'epicBoon';

export interface FeatDef {
  id: string;
  name: string;
  category: FeatCategory;
  /** minimum level (general 4, epic boons 19) */
  level?: number;
  /** abilities the feat can raise by 1 (general feats and boons) */
  abilityIncrease?: ('str' | 'dex' | 'con' | 'int' | 'wis' | 'cha')[];
  repeatable?: boolean;
  description: string;
}

export const FEATS: FeatDef[] = [
  // origin
  {
    id: 'alert',
    name: 'Allerta',
    category: 'origin',
    description:
      'Aggiungi il bonus di competenza all’iniziativa. Subito dopo aver tirato l’iniziativa puoi scambiarla con quella di un alleato consenziente.',
  },
  {
    id: 'magicInitiate',
    name: 'Iniziato alla magia',
    category: 'origin',
    repeatable: true,
    description:
      'Scegli la lista del chierico, del druido o del mago: impari 2 trucchetti e un incantesimo di 1° livello, che puoi lanciare una volta per riposo lungo senza slot (o con i tuoi slot). Caratteristica da incantatore: Int, Sag o Car.',
  },
  {
    id: 'savageAttacker',
    name: 'Attaccante selvaggio',
    category: 'origin',
    description: 'Una volta per turno, quando colpisci con un’arma, puoi tirare due volte i dadi di danno e usare il risultato che preferisci.',
  },
  {
    id: 'skilled',
    name: 'Abile',
    category: 'origin',
    repeatable: true,
    description: 'Ottieni competenza in tre abilità o strumenti a tua scelta, in qualsiasi combinazione.',
  },
  // general
  {
    id: 'abilityScoreImprovement',
    name: 'Aumento dei punteggi di caratteristica',
    category: 'general',
    level: 4,
    repeatable: true,
    description: 'Aumenta un punteggio di caratteristica di 2, oppure due punteggi di 1 (massimo 20).',
  },
  {
    id: 'grappler',
    name: 'Lottatore',
    category: 'general',
    level: 4,
    abilityIncrease: ['str', 'dex'],
    description:
      'Quando colpisci con un colpo senz’armi puoi infliggere danni e afferrare con lo stesso attacco (una volta per turno). Hai Vantaggio ai tiri per colpire contro chi stai afferrando e ti muovi a piena velocità trascinandolo.',
  },
  // fighting styles
  { id: 'archery', name: 'Stile: Tiro', category: 'fightingStyle', description: '+2 ai tiri per colpire con le armi a distanza.' },
  { id: 'defense', name: 'Stile: Difesa', category: 'fightingStyle', description: '+1 alla CA mentre indossi un’armatura leggera, media o pesante.' },
  {
    id: 'greatWeaponFighting',
    name: 'Stile: Armi grandi',
    category: 'fightingStyle',
    description: 'Con armi a due mani o versatili impugnate a due mani, tratta come 3 ogni 1 o 2 sui dadi di danno.',
  },
  {
    id: 'twoWeaponFighting',
    name: 'Stile: Due armi',
    category: 'fightingStyle',
    description: 'Quando attacchi con l’arma leggera extra, aggiungi il modificatore di caratteristica al danno.',
  },
  // epic boons
  { id: 'boonCombatProwess', name: 'Dono della prodezza in combattimento', category: 'epicBoon', level: 19, abilityIncrease: ['str', 'dex', 'con', 'int', 'wis', 'cha'], description: 'Una volta per turno, quando manchi un attacco, puoi invece colpire.' },
  { id: 'boonDimensionalTravel', name: 'Dono del viaggio dimensionale', category: 'epicBoon', level: 19, abilityIncrease: ['str', 'dex', 'con', 'int', 'wis', 'cha'], description: 'Dopo l’azione di Attacco o Magia puoi teletrasportarti fino a 9 m in uno spazio libero che vedi.' },
  { id: 'boonFate', name: 'Dono del fato', category: 'epicBoon', level: 19, abilityIncrease: ['str', 'dex', 'con', 'int', 'wis', 'cha'], description: 'Quando una creatura entro 18 m supera o fallisce una prova d20, puoi aggiungere o togliere 2d4 (una volta per tiro d’iniziativa o riposo breve).' },
  { id: 'boonIrresistibleOffense', name: 'Dono dell’offesa irresistibile', category: 'epicBoon', level: 19, abilityIncrease: ['str', 'dex'], description: 'I tuoi danni contundenti, perforanti e taglienti ignorano la resistenza. Con un 20 naturale aggiungi danni pari al punteggio di caratteristica.' },
  { id: 'boonSpellRecall', name: 'Dono del richiamo degli incantesimi', category: 'epicBoon', level: 19, abilityIncrease: ['int', 'wis', 'cha'], description: 'Una volta per riposo lungo lanci un incantesimo preparato di livello 1-4 senza spendere lo slot.' },
  { id: 'boonNightSpirit', name: 'Dono dello spirito notturno', category: 'epicBoon', level: 19, abilityIncrease: ['str', 'dex', 'con', 'int', 'wis', 'cha'], description: 'In penombra o oscurità diventi Invisibile con un’azione bonus e hai resistenza a tutti i danni tranne psichici e radiosi.' },
  { id: 'boonTruesight', name: 'Dono della vista pura', category: 'epicBoon', level: 19, abilityIncrease: ['str', 'dex', 'con', 'int', 'wis', 'cha'], description: 'Hai Vista pura entro 18 m.' },
];

export const featById = (id: string) => FEATS.find((f) => f.id === id);
export const ORIGIN_FEATS = FEATS.filter((f) => f.category === 'origin');
export const FIGHTING_STYLES = FEATS.filter((f) => f.category === 'fightingStyle');
