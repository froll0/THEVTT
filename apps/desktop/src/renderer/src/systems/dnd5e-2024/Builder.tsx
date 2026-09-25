import { dnd5e } from '@thevtt/systems';
import { Check } from 'lucide-react';
import { useState } from 'react';
import type { BuilderProps } from '..';
import { Dnd5eSheet } from './Sheet';
import { AbilitiesEditor, BackgroundPicker, ClassPicker, DetailsEditor, ProgressionEditor, SkillsEditor, SpeciesPicker, SpellsEditor, StartingEquipment } from './editors';

type C = dnd5e.Dnd5eCharacter;

interface Step {
  id: string;
  label: string;
  done: (c: C) => boolean;
  show?: (c: C) => boolean;
}

const STEPS: Step[] = [
  { id: 'class', label: 'Classe', done: (c) => !!dnd5e.getClass(c) },
  {
    id: 'species',
    label: 'Specie',
    done: (c) => {
      const sp = dnd5e.getSpecies(c);
      return !!sp && (!sp.choice || !!c.speciesChoices[sp.choice.key]);
    },
  },
  { id: 'background', label: 'Background', done: (c) => !!dnd5e.getBackground(c) && (c.backgroundId !== 'custom' || (c.customBackground.abilities.length === 3 && c.customBackground.skills.length === 2)) },
  { id: 'abilities', label: 'Caratteristiche', done: (c) => !dnd5e.validate(c).some((e) => /serie standard|punti|punteggi|\+2\/\+1|caratteristiche del background/.test(e)) },
  {
    id: 'skills',
    label: 'Abilità',
    done: (c) => {
      const cls = dnd5e.getClass(c);
      const sp = dnd5e.getSpecies(c);
      return !!cls && c.classSkills.length === cls.skillChoices && c.speciesSkills.length === (sp?.skillChoice?.count ?? 0) && c.expertise.length === dnd5e.expertiseCount(c);
    },
  },
  { id: 'progression', label: 'Livello e scelte', done: (c) => !!dnd5e.getClass(c) && !dnd5e.pending(c).some((p) => !/Trucchetti|Incantesimi|Maestria nelle abilità/.test(p)) },
  {
    id: 'spells',
    label: 'Incantesimi',
    show: (c) => !!dnd5e.spellcasting(c),
    done: (c) => {
      const sc = dnd5e.spellcasting(c);
      return !!sc && c.cantrips.length === sc.cantripsKnown && c.spells.length === sc.prepared;
    },
  },
  { id: 'equipment', label: 'Equipaggiamento', done: (c) => c.inventory.length > 0 || c.startingEquipment.classOption !== null },
  { id: 'details', label: 'Dettagli', done: (c) => !!c.name.trim() },
  { id: 'summary', label: 'Riepilogo', done: () => false },
];

export function Dnd5eBuilder({ value, onChange }: BuilderProps<C>) {
  const c = dnd5e.normalize(value);
  const set = (patch: Partial<C>) => onChange({ ...c, ...patch });
  const steps = STEPS.filter((s) => !s.show || s.show(c));
  const [stepId, setStepId] = useState(steps[0]!.id);
  const index = Math.max(0, steps.findIndex((s) => s.id === stepId));
  const step = steps[index]!;
  const issues = dnd5e.validate(c);
  const todo = dnd5e.pending(c);

  return (
    <div className="col" style={{ gap: 'var(--s5)' }}>
      <div className="stepper">
        {steps.map((s) => {
          const done = s.done(c);
          return (
            <button key={s.id} className={s.id === step.id ? 'active' : ''} onClick={() => setStepId(s.id)}>
              {done && s.id !== step.id ? <Check size={13} className="check" /> : null}
              {s.label}
            </button>
          );
        })}
      </div>

      {step.id === 'class' && <ClassPicker c={c} set={set} />}
      {step.id === 'species' && <SpeciesPicker c={c} set={set} />}
      {step.id === 'background' && <BackgroundPicker c={c} set={set} />}
      {step.id === 'abilities' && <AbilitiesEditor c={c} set={set} />}
      {step.id === 'skills' && <SkillsEditor c={c} set={set} />}
      {step.id === 'progression' && <ProgressionEditor c={c} set={set} allowLevel />}
      {step.id === 'spells' && <SpellsEditor c={c} set={set} />}
      {step.id === 'equipment' && <StartingEquipment c={c} onChange={onChange} />}
      {step.id === 'details' && <DetailsEditor c={c} set={set} />}
      {step.id === 'summary' && (
        <div className="col" style={{ gap: 'var(--s4)' }}>
          {issues.length > 0 ? (
            <div className="issues">
              <b className="small">Da sistemare</b>
              {issues.map((i) => (
                <span key={i}>• {i}</span>
              ))}
            </div>
          ) : todo.length > 0 ? (
            <div className="issues todo">
              <b className="small">Ancora da scegliere</b>
              {todo.map((i) => (
                <span key={i}>• {i}</span>
              ))}
            </div>
          ) : (
            <span className="badge live" style={{ width: 'fit-content' }}>
              <Check size={12} /> Personaggio pronto
            </span>
          )}
          <Dnd5eSheet data={c} editable={false} onChange={onChange} onRoll={() => undefined} />
        </div>
      )}

      <div className="row between" style={{ borderTop: '1px solid var(--border)', paddingTop: 'var(--s4)' }}>
        <button className="btn ghost" disabled={index === 0} onClick={() => setStepId(steps[index - 1]!.id)}>
          Indietro
        </button>
        {index < steps.length - 1 && (
          <button className="btn" onClick={() => setStepId(steps[index + 1]!.id)}>
            Avanti: {steps[index + 1]!.label}
          </button>
        )}
      </div>
    </div>
  );
}
