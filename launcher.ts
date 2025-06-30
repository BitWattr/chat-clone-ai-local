// @deno-types="deno.ns"
// launcher.ts
// This script starts the backend and frontend, then opens the browser to localhost:3000

export {}

function streamOutput(process: Deno.Process, name: string) {
  const decoder = new TextDecoder();
  (async () => {
    for await (const chunk of process.stdout.readable) {
      if (chunk) {
        console.log(`[${name}]`, decoder.decode(chunk));
      }
    }
  })();
  (async () => {
    for await (const chunk of process.stderr.readable) {
      if (chunk) {
        console.error(`[${name} ERROR]`, decoder.decode(chunk));
      }
    }
  })();
}

const backendProcess = Deno.run({
  cmd: ["deno", "run", "--allow-env", "--allow-net", "--allow-read", "src/deno_entry.ts"],
  cwd: "./worker",
  stdout: "piped",
  stderr: "piped",
});
streamOutput(backendProcess, "backend");

const frontendProcess = Deno.run({
  cmd: ["npm", "run", "dev"],
  cwd: "./frontend",
  env: { "BROWSER": "none" },
  stdout: "piped",
  stderr: "piped",
});
streamOutput(frontendProcess, "frontend");

// Wait a few seconds for servers to start
await new Promise((resolve) => setTimeout(resolve, 5000));

// Open the browser to localhost:3000
const openCmd = Deno.build.os === "windows"
  ? ["cmd", "/c", "start", "http://localhost:3000"]
  : ["xdg-open", "http://localhost:3000"];
const openProcess = Deno.run({ cmd: openCmd });

console.log("Webapp should be available at http://localhost:3000");

// Wait for both processes to exit (optional, or handle signals for cleanup)
await backendProcess.status();
await frontendProcess.status();
