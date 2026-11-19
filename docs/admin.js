'use strict';
const ADMIN_MODE=false,isLoopback=false;
const posterAdmin={available:false,authorized:false,job:null,token:''};
let publicPosterUrls=Object.create(null);
function localCover(f){return publicPosterUrls[f.id]||'';}
window.addEventListener('load',async()=>{
 try{const r=await fetch('./public-data/poster-urls.json');if(r.ok){publicPosterUrls=await r.json();render();}}catch(_){}
});
