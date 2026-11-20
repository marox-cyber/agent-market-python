import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';
import { stat } from 'node:fs/promises';
let loadedMtime = '', worker;
const server = createServer(async (req, res) => {
  try {
    const current = String((await stat('dist/server/index.js')).mtimeMs);
    if (loadedMtime !== current) { worker = (await import(pathToFileURL(process.cwd() + '/dist/server/index.js').href + '?v=' + current)).default; loadedMtime = current; }
    const response = await worker.fetch(new Request('http://' + (req.headers.host || 'localhost') + req.url, { method: req.method }));
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (e) { console.error(e.message); res.writeHead(500); res.end('Preview error'); }
});
const portArg = process.argv.indexOf('--port');
const hostArg = process.argv.indexOf('--host');
const port = Number(portArg >= 0 ? process.argv[portArg + 1] : process.env.PORT || 3000);
const host = hostArg >= 0 ? process.argv[hostArg + 1] : '0.0.0.0';
server.listen(port, host, () => console.log('Stoa Flow preview ready on ' + host + ':' + port));
