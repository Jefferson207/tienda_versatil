import crypto from 'node:crypto';
import {body,getCatalog,json,saveCatalog} from './_store.js';

const cookieName='mv_admin';
const secret=()=>process.env.ADMIN_SESSION_SECRET||process.env.ADMIN_PASSWORD||'';
const sign=value=>crypto.createHmac('sha256',secret()).update(value).digest('hex');
const parseCookies=value=>Object.fromEntries((value||'').split(';').map(item=>item.trim().split('=').map(decodeURIComponent)).filter(item=>item.length===2));
export const isAuthenticated=req=>{const token=parseCookies(req.headers.cookie)[cookieName];if(!token||!secret())return false;const [expires,signature]=token.split('.');return Number(expires)>Date.now()&&signature===sign(expires)};
const safeName=value=>String(value||'').trim().slice(0,80);
const safeCharacteristics=value=>Array.isArray(value)?value.map(item=>({
  name:String(item?.name||'').trim().slice(0,120),
  description:String(item?.description||'').trim().slice(0,500),
})).filter(item=>item.name&&item.description):[];
const slug=value=>safeName(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');

export default async function handler(req,res){
  if(req.method==='GET')return json(res,200,{authenticated:isAuthenticated(req)});
  if(req.method!=='POST')return json(res,405,{error:'Método no permitido'});
  try{
    const data=await body(req);
    if(data.action==='login'){
      if(data.username!==process.env.ADMIN_USERNAME||data.password!==process.env.ADMIN_PASSWORD)return json(res,401,{error:'Usuario o contraseña incorrectos.'});
      const expires=String(Date.now()+1000*60*60*8);
      const secure=process.env.NODE_ENV==='production'?'; Secure':'';
      res.setHeader('Set-Cookie',`${cookieName}=${encodeURIComponent(`${expires}.${sign(expires)}`)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=28800${secure}`);
      return json(res,200,{authenticated:true});
    }
    if(data.action==='logout'){res.setHeader('Set-Cookie',`${cookieName}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax${process.env.NODE_ENV==='production'?'; Secure':''}`);return json(res,200,{authenticated:false})}
    if(!isAuthenticated(req))return json(res,401,{error:'Sesión no autorizada.'});
    const catalog=await getCatalog();
    if(data.action==='createCategory'){
      const name=safeName(data.name);if(!name)return json(res,400,{error:'Ingresa el nombre de la categoría.'});
      if(catalog.categories.some(item=>item.toLowerCase()===name.toLowerCase()))return json(res,409,{error:'La categoría ya existe.'});
      catalog.categories.push(name);
    }else if(data.action==='deleteCategory'){
      const name=safeName(data.name);catalog.categories=catalog.categories.filter(item=>item!==name);catalog.products=catalog.products.map(product=>product.category===name?{...product,category:''}:product);delete (catalog.categoryImages||{})[name];
    }else if(data.action==='updateCategoryImage'){
      const name=safeName(data.name),image=String(data.image||'').trim().slice(0,2000);if(!catalog.categories.includes(name))return json(res,404,{error:'Categoría no encontrada.'});catalog.categoryImages={...(catalog.categoryImages||{})};if(image)catalog.categoryImages[name]=image;else delete catalog.categoryImages[name];
    }else if(data.action==='createProduct'||data.action==='updateProduct'){
      const incoming=data.product||{},name=safeName(incoming.name);if(!name)return json(res,400,{error:'El producto necesita un nombre.'});
      const images=String(incoming.image||'').split('|').map(value=>value.trim()).filter(Boolean).slice(0,3);
      const product={name,description:String(incoming.description||'').trim().slice(0,2000),price:Number(incoming.price)||0,oldPrice:Number(incoming.oldPrice)||0,image:images[0]||'/products/procesador-alimentos.png',sku:safeName(incoming.sku),category:catalog.categories.includes(incoming.category)?incoming.category:'',bestseller:Boolean(incoming.bestseller),inStock:incoming.inStock!==false,characteristics:safeCharacteristics(incoming.characteristics)};
      if(data.action==='createProduct'){product.id=crypto.randomUUID();product.slug=`${slug(name)}-${product.id.slice(0,6)}`;product.gallery=images.length?images:[product.image];catalog.products.push(product)}else{const index=catalog.products.findIndex(item=>String(item.id)===String(data.id));if(index<0)return json(res,404,{error:'Producto no encontrado.'});catalog.products[index]={...catalog.products[index],...product,gallery:images.length?images:[product.image]}}
    }else if(data.action==='deleteProduct'){
      catalog.products=catalog.products.filter(item=>String(item.id)!==String(data.id));
    }else return json(res,400,{error:'Acción no válida.'});
    await saveCatalog(catalog);
    return json(res,200,{ok:true});
  }catch(error){return json(res,500,{error:error.message||'Error inesperado.'})}
}
