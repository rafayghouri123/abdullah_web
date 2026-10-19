import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.join(path.dirname(fileURLToPath(import.meta.url)),'dist');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.avif':'image/avif','.woff2':'font/woff2'};
const server=http.createServer((req,res)=>{let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname)}catch{res.writeHead(400).end();return}let target=path.resolve(root,'.'+pathname);if(target!==root&&!target.startsWith(root+path.sep)){res.writeHead(403).end();return}if(pathname.endsWith('/'))target=path.join(target,'index.html');fs.readFile(target,(err,data)=>{if(err){res.writeHead(404).end('Not found');return}res.writeHead(200,{'Content-Type':types[path.extname(target)]||'application/octet-stream'});res.end(data)})});
server.listen(4173,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:4173'));
