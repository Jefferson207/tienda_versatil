const categoriesKey='mv:categories';
const productsKey='mv:products';

const seedCategories=['Balanzas','Selladoras','Gastronómicos','Cortadoras','Empacadoras','Procesadores'];
const seedProducts=[
  ['Balanza electrónica comercial 40 kg','Balanzas',299,349],
  ['Selladora de impulso 30 cm','Selladoras',189,229],
  ['Licuadora industrial 2 litros','Gastronómicos',459,0],
  ['Cortadora de embutidos 10”','Cortadoras',749,829],
  ['Empacadora al vacío profesional','Empacadoras',389,0],
  ['Procesador de alimentos 6 L','Procesadores',899,999],
].map(([name,category,price,oldPrice],index)=>{const image=index===3?'/products/cortadora-embutidos.png':`https://images.unsplash.com/photo-${['1586864387967-d02ef85d93e8','1605600659908-0ef719419d41','1570222094114-d054a817e56b','1598511726623-d6a7501f7e5b','1542838132-92c53300491e','1556911220-bff31c812dba'][index]}?auto=format&fit=crop&w=900&q=85`;return {id:index+1,slug:['balanza-electronica-comercial-40-kg','selladora-de-impulso-30-cm','licuadora-industrial-2-litros','cortadora-de-embutidos-10','empacadora-al-vacio-profesional','procesador-de-alimentos-6-l'][index],name,category,price,oldPrice,image,gallery:[image],sku:`MV-00${index+1}`,bestseller:index===0||index===2||index===4}});

function config(){
  const url=process.env.UPSTASH_REDIS_REST_URL;
  const token=process.env.UPSTASH_REDIS_REST_TOKEN;
  if(!url||!token)throw new Error('Faltan las variables de Upstash Redis en el servidor.');
  return {url:url.replace(/\/$/,''),token};
}

async function command(...parts){
  const {url,token}=config();
  const response=await fetch(`${url}/${parts.map(part=>encodeURIComponent(String(part))).join('/')}`,{headers:{Authorization:`Bearer ${token}`}});
  if(!response.ok)throw new Error('No se pudo acceder a Redis.');
  return response.json();
}

export async function getCatalog(){
  const [categoriesResult,productsResult]=await Promise.all([command('get',categoriesKey),command('get',productsKey)]);
  const categories=categoriesResult.result?JSON.parse(categoriesResult.result):seedCategories;
  const products=productsResult.result?JSON.parse(productsResult.result):seedProducts;
  return {categories,products};
}

export async function saveCatalog(catalog){
  await Promise.all([
    command('set',categoriesKey,JSON.stringify(catalog.categories)),
    command('set',productsKey,JSON.stringify(catalog.products)),
  ]);
}

export function json(res,status,data){res.status(status).json(data)}

export async function body(req){
  if(typeof req.body==='string')return JSON.parse(req.body||'{}');
  return req.body||{};
}
