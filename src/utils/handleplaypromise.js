function handlePlayPromise(playPromise) {
  if (!playPromise || typeof playPromise.catch  !== 'function') return;

  playPromise.catch((e) => {
    if (e && e.name === 'AbortError') {
      return;
    }
    throw e;
  });
}

export default handlePlayPromise;
