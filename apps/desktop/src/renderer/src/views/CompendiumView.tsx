import { Compendium } from '../components/Compendium';

/** Launcher: the rules, always at hand outside the table too. */
export function CompendiumView() {
  return (
    <div className="compendium-page">
      <Compendium systemId="dnd5e-2024" />
    </div>
  );
}
