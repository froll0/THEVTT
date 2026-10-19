import type { ChatCard } from '@thevtt/shared';
import { MessageSquareShare } from 'lucide-react';

/** "Show in chat" for a spell, feature or item of a sheet; nothing away from the table. */
export function ShareButton({ onShare, card }: { onShare: ((card: ChatCard) => void) | undefined; card: () => ChatCard }) {
  if (!onShare) return null;
  return (
    <button
      type="button"
      className="btn ghost sm icon share"
      title="Mostra in chat"
      aria-label="Mostra in chat"
      onClick={(e) => {
        // inside a <summary> it must not open or close the details too
        e.preventDefault();
        e.stopPropagation();
        onShare(card());
      }}
    >
      <MessageSquareShare size={13} />
    </button>
  );
}
