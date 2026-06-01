"use strict";

// Multiselect checklist interaktif untuk terminal — zero dependency.
// ↑/↓ atau k/j pindah, spasi toggle, a pilih semua, enter konfirmasi, q/esc batal.
// Hanya dipakai saat stdin/stdout adalah TTY.

function isInteractive() {
  return Boolean(process.stdin.isTTY && process.stdout.isTTY);
}

function multiselect({ message, choices }) {
  return new Promise((resolve) => {
    const selected = new Set(choices.map((_, i) => i)); // default: semua dipilih
    let cursor = 0;

    const out = process.stdout;
    const input = process.stdin;

    function render(first) {
      if (!first) {
        // Naikkan kursor ke awal blok untuk re-render.
        out.write(`\x1b[${choices.length + 2}A`);
      }
      out.write(`\x1b[J`); // clear ke bawah
      out.write(`${message}\n`);
      choices.forEach((choice, i) => {
        const pointer = i === cursor ? "\x1b[36m›\x1b[0m" : " ";
        const box = selected.has(i) ? "\x1b[32m◉\x1b[0m" : "◯";
        const label = i === cursor ? `\x1b[1m${choice.label}\x1b[0m` : choice.label;
        out.write(`${pointer} ${box} ${label}\n`);
      });
      out.write(
        "\x1b[2m  ↑/↓ pindah · spasi pilih · a semua · enter ok · q batal\x1b[0m\n",
      );
    }

    function cleanup() {
      if (input.isTTY) input.setRawMode(false);
      input.pause();
      input.removeListener("data", onData);
    }

    function finish(result) {
      cleanup();
      out.write("\n");
      resolve(result);
    }

    function onData(buf) {
      const key = buf.toString();
      if (key === "\x03" || key === "q" || key === "\x1b") {
        // Ctrl-C / q / esc → batal
        return finish(null);
      }
      if (key === "\r" || key === "\n") {
        return finish(
          [...selected].sort((a, b) => a - b).map((i) => choices[i].value),
        );
      }
      if (key === " ") {
        if (selected.has(cursor)) selected.delete(cursor);
        else selected.add(cursor);
      } else if (key === "a") {
        if (selected.size === choices.length) selected.clear();
        else choices.forEach((_, i) => selected.add(i));
      } else if (key === "\x1b[A" || key === "k") {
        cursor = (cursor - 1 + choices.length) % choices.length;
      } else if (key === "\x1b[B" || key === "j") {
        cursor = (cursor + 1) % choices.length;
      }
      render(false);
    }

    if (input.isTTY) input.setRawMode(true);
    input.resume();
    input.setEncoding("utf8");
    input.on("data", onData);
    render(true);
  });
}

module.exports = { multiselect, isInteractive };
