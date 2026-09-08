import http from 'node:http';
import {createServer as createViteServer,loadEnv} from 'vite';

Object.assign(process.env,loadEnv('development',process.cwd(),''));

const handlers={
  '/api/admin':()=>import('./api/admin.js'),
  '/api/catalog':()=>import('./api/catalog.js'),
  '/api/upload':()=>import('./api/upload.js'),
};

const readJson=async request=>{
  const chunks=[];
  for await(const chunk of request)chunks.push(chunk);
  const text=Buffer.concat(chunks).toString();
  return text?JSON.parse(text):{};
};

const vite=await createViteServer({server:{middlewareMode:true},appType:'spa'});
const server=http.createServer(async(request,response)=>{
  response.status=code=>{response.statusCode=code;return response};
  response.json=data=>{if(!response.headersSent)response.setHeader('Content-Type','application/json; charset=utf-8');response.end(JSON.stringify(data))};
  const path=new URL(request.url,'http://localhost').pathname;
  const loadHandler=handlers[path];
  if(loadHandler){
    try{
      if((path==='/api/admin'&&request.method==='POST')||(path==='/api/upload'&&request.method==='DELETE'))request.body=await readJson(request);
      const module=await loadHandler();
      return module.default(request,response);
    }catch(error){return response.status(500).json({error:error.message||'Error del servidor local.'})}
  }
  vite.middlewares(request,response,()=>{response.statusCode=404;response.end('No encontrado')});
});

server.listen(5173,()=>console.log('Tienda local: http://localhost:5173'));
