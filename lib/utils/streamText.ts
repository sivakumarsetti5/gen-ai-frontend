export const streamText = (
  text: string,
  onUpdate: (chunk: string) => void,
  speed = 20
) => {
  let index = 0;

  const interval = setInterval(() => {
    if (index < text.length) {
      onUpdate(text.slice(0, index + 1));
      index++;
    } else {
      clearInterval(interval);
    }
  }, speed);
};