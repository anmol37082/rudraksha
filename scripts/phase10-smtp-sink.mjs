// Test-only SMTP sink. It accepts mail on loopback and stores the message body
// in a caller-selected temporary file; it never relays mail to an external host.
import net from "node:net";
import { writeFile } from "node:fs/promises";

const port = Number(process.env.PHASE10_SMTP_PORT ?? 2525);
const capture = process.env.PHASE10_SMTP_CAPTURE_FILE;
if (!capture || !Number.isInteger(port) || port < 1024 || port > 65535) {
  throw new Error("Set PHASE10_SMTP_CAPTURE_FILE and a valid loopback test port");
}

const server = net.createServer((socket) => {
  socket.setEncoding("utf8");
  socket.on("error", (error) => process.stderr.write(`SMTP test client disconnected: ${error.code ?? "socket error"}\n`));
  socket.write("220 phase10-local-test-sink ESMTP\r\n");
  let buffer = "";
  let inData = false;
  let authLoginStage = 0;
  let message = "";
  socket.on("data", async (chunk) => {
    buffer += chunk;
    while (buffer.includes("\r\n")) {
      const end = buffer.indexOf("\r\n");
      const line = buffer.slice(0, end);
      buffer = buffer.slice(end + 2);
      process.stdout.write(`SMTP test command: ${inData ? "DATA_LINE" : line.split(/\s+/, 1)[0]}\n`);
      if (inData) {
        if (line === ".") {
          inData = false;
          await writeFile(capture, message, { encoding: "utf8", mode: 0o600 });
          message = "";
          socket.write("250 test message captured\r\n");
        } else message += `${line.startsWith("..") ? line.slice(1) : line}\r\n`;
      } else if (/^EHLO\s/i.test(line) || /^HELO\s/i.test(line)) {
        socket.write("250-phase10-local-test-sink\r\n250-AUTH PLAIN LOGIN\r\n250 OK\r\n");
      } else if (/^AUTH PLAIN(?:\s|$)/i.test(line)) socket.write("235 2.7.0 Authentication successful\r\n");
      else if (/^AUTH LOGIN$/i.test(line)) { authLoginStage = 1; socket.write("334 VXNlcm5hbWU6\r\n"); }
      else if (/^(MAIL FROM|RCPT TO):/i.test(line)) socket.write("250 2.1.0 OK\r\n");
      else if (/^DATA$/i.test(line)) { inData = true; socket.write("354 End data with <CR><LF>.<CR><LF>\r\n"); }
      else if (/^RSET$/i.test(line)) socket.write("250 OK\r\n");
      else if (/^NOOP$/i.test(line)) socket.write("250 OK\r\n");
      else if (/^QUIT$/i.test(line)) { socket.write("221 Bye\r\n"); socket.end(); }
      else if (authLoginStage === 1) { authLoginStage = 2; socket.write("334 UGFzc3dvcmQ6\r\n"); }
      else if (authLoginStage === 2) { authLoginStage = 0; socket.write("235 2.7.0 Authentication successful\r\n"); }
      else socket.write("250 OK\r\n");
    }
  });
});

server.listen(port, "127.0.0.1", () => process.stdout.write(`Phase 10 local SMTP sink listening on 127.0.0.1:${port}\n`));
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => server.close(() => process.exit(0)));
