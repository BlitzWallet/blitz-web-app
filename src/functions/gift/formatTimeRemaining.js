export function formatTimeRemaining(expireTime) {
  const now = Date.now();
  const diff = expireTime - now;

  if (diff <= 0) {
    return { string: "Expired", time: diff };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) {
    return { string: `${days}d ${hours}h left`, time: diff };
  }
  if (hours > 0) {
    return { string: `${hours}h ${minutes}m left`, time: diff };
  }
  if (minutes > 0) {
    return { string: `${minutes}m left`, time: diff };
  }
  return { string: "Less than a minute", time: diff };
}
