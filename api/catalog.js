import {getCatalog,json} from './_store.js';

export default async function handler(req,res){
  if(req.method!=='GET')return json(res,405,{error:'Método no permitido'});
  try{return json(res,200,await getCatalog())}catch(error){return json(res,500,{error:error.message})}
}
