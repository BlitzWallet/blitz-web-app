const eventQueue = [];
let visibilityListener = null;

let isProcessingQueue = false;

export const handleEventEmitterPost = (
  eventEmitter,
  eventName,
  ...eventParams
) => {
  try {
    const listenerCount = eventEmitter.listenerCount?.(eventName);
    const [updateType] = eventParams;
    const isAppActive = document.visibilityState === "visible";
    const hasListeners = listenerCount > 0;

    if (hasListeners && isAppActive) {
      console.log(`Emitting ${eventName} immediately (type: ${updateType})`);
      eventEmitter.emit(eventName, ...eventParams);
      return;
    }

    console.log(
      `Queueing ${eventName} (type: ${updateType}, visible: ${isAppActive}, listeners: ${listenerCount})`,
    );
    eventQueue.push({
      eventEmitter,
      eventName,
      eventParams,
      timestamp: Date.now(),
    });

    if (!visibilityListener) {
      setupVisibilityListener();
    }
  } catch (err) {
    console.log("Error handling event emitter", err);
    try {
      eventEmitter.emit(eventName, ...eventParams);
    } catch (emitErr) {
      console.log("Failed to emit event in fallback", emitErr);
    }
  }
};

const setupVisibilityListener = () => {
  const handleVisibilityChange = () => {
    console.log(`Visibility changed to: ${document.visibilityState}`);
    if (document.visibilityState === "visible") {
      processQueuedEvents();
    }
  };

  console.log("Adding visibilitychange listener");
  visibilityListener = handleVisibilityChange;
  document.addEventListener("visibilitychange", visibilityListener);
};

const processQueuedEvents = async () => {
  if (isProcessingQueue) return;
  if (eventQueue.length === 0) return;

  isProcessingQueue = true;
  console.log(`Processing ${eventQueue.length} queued events`);

  const eventsToProcess = [...eventQueue];
  eventQueue.length = 0;

  for (const {
    eventEmitter,
    eventName,
    eventParams,
    timestamp,
  } of eventsToProcess) {
    const age = Date.now() - timestamp;
    try {
      const listenerCount = eventEmitter.listenerCount?.(eventName);
      if (!listenerCount) {
        console.log(
          `No listeners for ${eventName} after ${age}ms, retrying...`,
        );
        await attemptEmitWithRetry(eventEmitter, eventName, eventParams);
      } else {
        console.log(`Emitting queued ${eventName} after ${age}ms`);
        eventEmitter.emit(eventName, ...eventParams);
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    } catch (err) {
      console.error(`Error processing queued event ${eventName}:`, err);
    }
  }

  isProcessingQueue = false;
};

const attemptEmitWithRetry = (eventEmitter, eventName, eventParams) => {
  let attempts = 0;
  const maxAttempts = 3;
  const retryDelay = 2000;

  return new Promise((resolve) => {
    const attemptEmit = () => {
      attempts++;
      const listenerCount = eventEmitter.listenerCount?.(eventName);
      if (listenerCount > 0 && eventEmitter.emit(eventName, ...eventParams)) {
        resolve(true);
        return;
      }
      if (attempts >= maxAttempts) {
        resolve(false);
        return;
      }
      setTimeout(attemptEmit, retryDelay);
    };
    attemptEmit();
  });
};

export const cleanupEventHandler = () => {
  if (visibilityListener) {
    document.removeEventListener("visibilitychange", visibilityListener);
    visibilityListener = null;
  }
  eventQueue.length = 0;
  isProcessingQueue = false;
};
