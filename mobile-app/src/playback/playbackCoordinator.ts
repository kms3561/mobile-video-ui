type StopPlayback = () => void;

type PlaybackRegistration = {
  stopPlayback: StopPlayback;
  token: symbol;
};

const players = new Map<string, PlaybackRegistration>();
let activePlayerId: string | null = null;

export function registerPlaybackItem(id: string, stopPlayback: StopPlayback) {
  const token = Symbol(id);
  players.set(id, { stopPlayback, token });

  return () => {
    const registration = players.get(id);
    const isCurrentRegistration = registration?.token === token;

    if (isCurrentRegistration) {
      players.delete(id);
    }

    if (isCurrentRegistration && activePlayerId === id) {
      activePlayerId = null;
    }
  };
}

export function requestPlayback(id: string, source: 'audio' | 'video') {
  if (activePlayerId === id) {
    return;
  }

  const previousActiveId = activePlayerId;
  activePlayerId = id;
  logPlayback(`activate ${source}`, id, previousActiveId);

  if (previousActiveId && previousActiveId !== id) {
    const previousRegistration = players.get(previousActiveId);

    if (previousRegistration) {
      logPlayback(`pause previous item for ${source}`, previousActiveId, id);
      previousRegistration.stopPlayback();
    }
  }
}

export function clearActivePlayback(id: string, reason: string) {
  if (activePlayerId === id) {
    logPlayback(`clear active: ${reason}`, id);
    activePlayerId = null;
  }
}

function logPlayback(message: string, mediaId: string, relatedId?: string | null) {
  if (!__DEV__) {
    return;
  }

  console.log('[playback]', {
    activeMediaId: activePlayerId,
    mediaId,
    message,
    relatedId,
  });
}
