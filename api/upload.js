import {isAuthenticated} from './admin.js';
import {body,json} from './_store.js';
import {Readable} from 'node:stream';

export const config={api:{bodyParser:false}};

const imageUrl=result=>result?.url||result?.data?.url||result?.data?.path||result?.path||result?.file?.url||null;

export default async function handler(req,res){
  if(!['POST','DELETE'].includes(req.method))return json(res,405,{error:'Método no permitido'});
  if(!isAuthenticated(req))return json(res,401,{error:'Sesión no autorizada.'});
  const url=process.env.CPANEL_UPLOAD_URL;
  const token=process.env.CPANEL_UPLOAD_TOKEN;
  if(!url||!token)return json(res,500,{error:'Falta configurar el servicio de imágenes en el servidor.'});
  try{
    if(req.method==='DELETE'){
      const data=await body(req),form=new FormData();
      form.set('token',token);form.set('action','delete');form.set('url',String(data.url||''));
      const response=await fetch(url,{method:'POST',body:form});
      const result=await response.json();
      return json(res,response.ok?200:response.status,result);
    }
    const contentType=req.headers['content-type']||'';
    if(!contentType.includes('multipart/form-data'))return json(res,400,{error:'Selecciona una imagen para subir.'});
    const incoming=new Request('http://localhost',{method:'POST',headers:{'Content-Type':contentType},body:Readable.toWeb(req),duplex:'half'});
    const form=await incoming.formData();
    form.set('token',token);
    const response=await fetch(url,{method:'POST',body:form});
    const text=await response.text();
    let result;try{result=JSON.parse(text)}catch{result={url:text.trim()}}
    if(!response.ok)return json(res,response.status,{error:result.error||'No se pudo subir la imagen.'});
    const uploadedUrl=imageUrl(result);
    if(!uploadedUrl)return json(res,502,{error:'El servidor de imágenes no devolvió una URL válida.'});
    return json(res,200,{url:uploadedUrl});
  }catch(error){return json(res,500,{error:error.message||'No se pudo subir la imagen.'})}
}
