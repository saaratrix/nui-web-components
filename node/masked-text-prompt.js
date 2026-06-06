import { createInterface } from 'readline/promises';

// Notes: Was an experiment with masking passwords etc, to not use some ready made package.
// And this was like my first time doing stdin & stdout processing like this, at least with node.
// So I'm sure it could be better, or missing some secure thing or can break streams.
// But it does work for the use I needed it for!

/**
 * @param {string} question
 * @param {boolean} mask
 * @returns {Promise<string>}
 */
export const readPromptValue = (question, mask = false) => {
  const promise = new Promise(async (res) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: question,
    });

    let value = '';
    let enterPressed = false;
    rl.once('close', () => {
      if (!enterPressed) {
        rl.write('\n');
      }
      clearTimeout(timeoutId);
      process.stdin.off('keypress', onKeyPress);
      res(value);
    });

    const inputDelay = 3;
    let presses = 0;
    let timeoutId = undefined;

    const onKeyPress = (s, key) => {
      if (key && key.name === 'backspace') {
        if (value.length > 0) {
          value = value.slice(0, -1);
        }
        return;
      }

      // Enter, so we end the stream.
      if (s.includes('\r') || s.includes('\n')) {
        enterPressed = true;
        process.stdin.off('keypress', onKeyPress);
        // We need to use a set immediate to let rl process what is going on, or it gets stuck in a corrupt state and won't process other inputs.
        setImmediate(() => rl.close());
        return;
      }

      presses++;
      value += s;

      if (mask) {
        process.stdout.clearLine(0);
        process.stdout.cursorTo(0);
        process.stdout.write(question + '*'.repeat(value.length));
      }

      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(() => {
        if (presses > 3) {
          rl.close();
        }
        presses = 0;
      }, inputDelay);
    }

    process.stdin.on('keypress', onKeyPress);
    rl.prompt();
  });

  return promise;
};
