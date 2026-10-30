(() => {
'use strict';
const entries=[...document.querySelectorAll('[data-entry="competitor"]')];
const form=document.querySelector('[data-brief]');
const results=document.querySelector('[data-results]');
const status=document.querySelector('[data-global-status]');
const $=(s)=>document.querySelector(s);
const hexPattern=/^#[0-9a-f]{6}$/i;
const state=new WeakMap();
function setStatus(entry,msg,error=false){const el=entry.querySelector('[data-status]');el.textContent=msg;el.classList.toggle('is-error',error)}
function setSlot(entry,slot,hex,source='Color estimado · confirma si forma parte de la identidad'){
 const root=entry.querySelector('[data-color-slot="'+slot+'"]');
 if(!root||!hexPattern.test(hex||''))return;
 root.querySelector('[data-picker]').value=hex;
 root.querySelector('[data-hex]').value=hex.toUpperCase();
 root.querySelector('[data-color-source]').textContent=source;
 root.querySelector('[data-include]').checked=true;
}
function getColors(entry){
 return ['a','b'].map(slot=>{
  const root=entry.querySelector('[data-color-slot="'+slot+'"]');
  const hex=root.querySelector('[data-hex]').value.trim();
  return {hex:hex.toUpperCase(),included:root.querySelector('[data-include]').checked&&hexPattern.test(hex),slot};
 }).filter(x=>x.included);
}
entries.forEach((entry,index)=>{
 const file=entry.querySelector('[data-file]'),preview=entry.querySelector('[data-preview]'),title=entry.querySelector('[data-upload-title]');
 let url=null,token=0;
 file.addEventListener('change',async()=>{
  const f=file.files&&file.files[0];if(!f)return;
  const current=++token;title.textContent='Analizando…';setStatus(entry,'Separando los tonos del logotipo y comprobando si existe un fondo reconocible.');
  try{
   const loaded=await window.TerritorioColor.loadLogo(f);
   if(current!==token){URL.revokeObjectURL(loaded.previewUrl);return}
   const extracted=window.TerritorioColor.extractColors(loaded.image,'auto');
   if(url)URL.revokeObjectURL(url);url=loaded.previewUrl;
   preview.replaceChildren();const img=document.createElement('img');img.src=url;img.alt='Vista previa del logotipo';preview.append(img);title.textContent=f.name;
   entry.querySelector('[data-color-control]').hidden=false;
   const foreground=extracted.colors||[];
   const primary=foreground[0]?.hex;
   const second=extracted.background&&extracted.backgroundConfidence!=='ninguna'
    ? extracted.background : foreground.find((c,i)=>i>0&&c.hex!==primary)?.hex;
   if(primary)setSlot(entry,'a',primary,'Extraído de la forma o tipografía · confirma');
   if(second)setSlot(entry,'b',second,extracted.background?'Detectado en el borde como posible fondo · confirma':'Segundo tono visible · confirma');
   else{
    const b=entry.querySelector('[data-color-slot="b"]');
    b.querySelector('[data-hex]').value='';b.querySelector('[data-color-source]').textContent='No se ha detectado un segundo tono claro. Puedes añadirlo manualmente o dejarlo fuera.';
    b.querySelector('[data-include]').checked=false;
   }
   const confidence=extracted.backgroundConfidence;
   setStatus(entry,'Revisión necesaria: la detección es una estimación. El fondo solo se propone cuando el análisis de bordes encuentra un tono consistente ('+confidence+'). Activa o desactiva cada color según la identidad real.');
  }catch(error){title.textContent='No se pudo leer el archivo';setStatus(entry,error.message||'Prueba con un PNG, JPEG o SVG válido.',true)}
 });
 entry.querySelectorAll('[data-color-slot]').forEach(root=>{
  const picker=root.querySelector('[data-picker]'),hex=root.querySelector('[data-hex]');
  picker.addEventListener('input',()=>{hex.value=picker.value.toUpperCase();setStatus(entry,'Color ajustado manualmente. Valida que pertenezca a la identidad de esta marca.')});
  hex.addEventListener('change',()=>{
   const value=hex.value.trim();
   if(!hexPattern.test(value)){hex.setAttribute('aria-invalid','true');setStatus(entry,'Introduce un HEX válido, por ejemplo #EA5A77.',true);return}
   hex.removeAttribute('aria-invalid');picker.value=value;hex.value=value.toUpperCase();
   setStatus(entry,'Código HEX validado.'); 
  });
 });
});
function family(hex){
 const c=window.TerritorioColor.toOklch(hex);
 if(c.h===null||c.C<.035)return c.L<.23?'negro':c.L>.91?'blanco':'neutro';
 const h=c.h;
 if(h<18||h>=345)return'rojo/rosa';if(h<45)return'naranja';if(h<68)return'amarillo';if(h<160)return'verde';if(h<205)return'turquesa';if(h<255)return'azul';if(h<290)return'violeta';if(h<325)return'magenta';return'rojo/rosa';
}
const familyNames={'rojo/rosa':'rojos y rosas',naranja:'naranjas',amarillo:'amarillos',verde:'verdes',turquesa:'turquesas',azul:'azules',violeta:'violetas',magenta:'magenta',negro:'negros',blanco:'blancos',neutro:'neutros'};
function hue(hex){const c=window.TerritorioColor.toOklch(hex);return c.h===null?null:c.h}
function polar(hex,radius=150){
 const h=hue(hex);const angle=((h===null?210:h)-90)*Math.PI/180;
 const c=window.TerritorioColor.toOklch(hex);
 const r=radius*(.52+.43*(1-c.L));
 return {x:220+Math.cos(angle)*r,y:220+Math.sin(angle)*r};
}
function svgEl(name,attrs={}){const el=document.createElementNS('http://www.w3.org/2000/svg',name);Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,String(v)));return el}
function wheelBase(svg){
 svg.setAttribute('viewBox','0 0 440 440');svg.setAttribute('role','img');
 [45,90,135,180].forEach(r=>svg.append(svgEl('circle',{cx:220,cy:220,r,fill:'none',stroke:'#d8d0c4','stroke-width':1})));
 for(let a=0;a<360;a+=30){const t=(a-90)*Math.PI/180;svg.append(svgEl('line',{x1:220+Math.cos(t)*45,y1:220+Math.sin(t)*45,x2:220+Math.cos(t)*180,y2:220+Math.sin(t)*180,stroke:'#e5ded4','stroke-width':1}))}
 svg.append(svgEl('circle',{cx:220,cy:220,r:4,fill:'#292729'}));
}
function renderCompetitorWheel(competitors){
 const board=$('[data-board]');board.replaceChildren();
 const layout=document.createElement('div');layout.className='wheel-layout';
 const svg=svgEl('svg',{class:'chromatic-wheel competitor-wheel'});wheelBase(svg);
 const list=document.createElement('div');list.className='wheel-legend';
 competitors.forEach((brand,i)=>{
  const pts=brand.colors.map(c=>({color:c,point:polar(c.hex)}));
  if(pts.length>1)for(let j=1;j<pts.length;j++)svg.append(svgEl('line',{x1:pts[0].point.x,y1:pts[0].point.y,x2:pts[j].point.x,y2:pts[j].point.y,stroke:'#292729','stroke-width':1.7,'stroke-opacity':.65}));
  pts.forEach((p,j)=>{svg.append(svgEl('circle',{cx:p.point.x,cy:p.point.y,r:10,fill:p.color.hex,stroke:'#fff','stroke-width':2}));svg.append(svgEl('circle',{cx:p.point.x,cy:p.point.y,r:13,fill:'none',stroke:'#292729','stroke-width':.7,'stroke-opacity':.5}))});
  const row=document.createElement('div');row.className='wheel-legend-row';
  const mark=document.createElement('span');mark.className='legend-index';mark.textContent=String(i+1).padStart(2,'0');
  const content=document.createElement('div');const name=document.createElement('strong');name.textContent=brand.name;content.append(name);
  const swatches=document.createElement('div');swatches.className='legend-swatches';
  brand.colors.forEach(c=>{const s=document.createElement('span');s.style.setProperty('--swatch',c.hex);s.textContent=c.slot.toUpperCase()+' · '+c.hex;swatches.append(s)});
  content.append(swatches);row.append(mark,content);list.append(row);
 });
 const caption=document.createElement('p');caption.className='wheel-caption';caption.textContent='La posición angular representa la familia cromática; la distancia al centro es orientativa y no mide calidad ni rendimiento de marca.';
 layout.append(svg,list);board.append(layout,caption);
}
function keywordProfile(data){
 const text=(data.values+' '+data.personality+' '+data.description).toLowerCase();
 const tests=[
  {re:/confianz|seguridad|profesional|experiencia|rigor|solidez/,h:215,label:'confianza y solvencia'},
  {re:/natural|sostenib|ecológ|orgán|bienestar|salud|artesanal/,h:145,label:'naturalidad y cuidado'},
  {re:/innov|tecnolog|digital|futur|disrupt|creativ|vanguard/,h:265,label:'innovación y exploración'},
  {re:/premium|lujo|exclusiv|sofistic|elegan|select/,h:35,label:'sofisticación y exclusividad'},
  {re:/cercan|amable|accesib|familiar|divertid|optimis/,h:345,label:'cercanía y energía'}
 ];
 return tests.find(x=>x.re.test(text))||{h:195,label:'equilibrio y contemporaneidad'};
}
function makeRouteSet(data,competitors){
 const profile=keywordProfile(data);
 const hues=competitors.flatMap(b=>b.colors.map(c=>hue(c.hex))).filter(h=>h!==null);
 const circularMean=hues.length?((Math.atan2(hues.reduce((s,h)=>s+Math.sin(h*Math.PI/180),0),hues.reduce((s,h)=>s+Math.cos(h*Math.PI/180),0))*180/Math.PI+360)%360):profile.h;
 const nearest=(target)=>Math.min(...hues.map(h=>Math.abs(((h-target+540)%360)-180)),180);
 return [
  {title:'Afinidad con personalidad propia',tag:'EVOLUCIONAR EL CÓDIGO',h:profile.h,position:'Una entrada reconocible en la categoría, interpretada desde '+profile.label+'.',why:'Puede ser pertinente si la marca necesita credibilidad inmediata o si el público espera ciertos códigos visuales. La oportunidad estaría en la temperatura, la saturación, la proporción y el sistema gráfico, no en copiar el color dominante.',watch:'Evitar que la familiaridad se convierta en indistinción. El matiz y la ejecución deberán sostener una voz propia.'},
  {title:'Desplazamiento cromático',tag:'DIFERENCIARSE SIN RUIDO',h:(circularMean+52)%360,position:'Buscar una distancia perceptible respecto a la zona más repetida de la muestra, sin forzar un contraste opuesto.',why:'Es una hipótesis útil cuando la marca quiere ser reconocible en su sector, pero no parecer una variante más. La distancia debe comprobarse junto al tono verbal, la fotografía, la tipografía y los códigos de la categoría.',watch:'No convertir la diferencia en un fin. Si el tono no expresa la propuesta de valor, será una ocurrencia, no una estrategia.'},
  {title:'Territorio expresivo alternativo',tag:'REDEFINIR LA EXPECTATIVA',h:(profile.h+126)%360,position:'Explorar un lenguaje menos habitual en la muestra, siempre que encaje con la personalidad y las expectativas del público.',why:'Puede abrir una posición más singular si el producto, la experiencia y el relato de marca justifican ese cambio. La ruptura debe ser coherente en todos los puntos de contacto y no depender únicamente del color.',watch:'Mayor riesgo de alejarse de las señales que ayudan a entender la categoría. Requiere validación con público y contexto competitivo más amplio.'}
 ];
}
function renderTerritoryWheel(routes,competitors){
 const host=$('[data-routes]');host.replaceChildren();
 const wrap=document.createElement('div');wrap.className='territory-exploration';
 const svg=svgEl('svg',{class:'chromatic-wheel territory-wheel'});wheelBase(svg);
 const markerColors=['#EA5A77','#46B382','#D2A158'];
 routes.forEach((route,i)=>{
  const angle=(route.h-90)*Math.PI/180;const p={x:220+Math.cos(angle)*148,y:220+Math.sin(angle)*148};
  svg.append(svgEl('circle',{cx:p.x,cy:p.y,r:27,fill:markerColors[i],'fill-opacity':.13,stroke:markerColors[i],'stroke-width':2}));
  svg.append(svgEl('circle',{cx:p.x,cy:p.y,r:7,fill:markerColors[i]}));
  const t=svgEl('text',{x:p.x,y:p.y-38,'text-anchor':'middle','font-size':12,fill:'#292729','font-weight':700});t.textContent='0'+(i+1);svg.append(t);
 });
 const cards=document.createElement('div');cards.className='territory-cards';
 routes.forEach((r,i)=>{
  const card=document.createElement('article');card.className='territory-card';
  const top=document.createElement('p');top.className='route-tag';top.textContent='TERRITORIO 0'+(i+1)+' · '+r.tag;
  const title=document.createElement('h3');title.textContent=r.title;
  const marker=document.createElement('span');marker.className='territory-marker';marker.style.background=markerColors[i];
  const pos=document.createElement('p');pos.textContent=r.position;
  const why=document.createElement('p');why.textContent=r.why;
  const watch=document.createElement('p');watch.className='territory-watch';watch.textContent='Punto crítico: '+r.watch;
  card.append(top,title,marker,pos,why,watch);cards.append(card);
 });
 const note=document.createElement('p');note.className='wheel-caption';note.textContent='Los tres puntos son territorios de exploración, no colores definitivos ni paletas cerradas. La rueda sitúa cada hipótesis por familia cromática; el desarrollo de identidad decidirá después matices, combinaciones y proporciones.';
 wrap.append(svg,cards);host.append(wrap,note);
}
function analyze(){
 if(!form.reportValidity()){form.reportValidity();$('#briefing').scrollIntoView({behavior:'smooth'});return}
 const competitors=entries.map((entry,i)=>({entry,name:entry.querySelector('[data-name]').value.trim()||'Marca '+(i+1),colors:getColors(entry)})).filter(b=>b.colors.length);
 if(competitors.length<2){status.textContent='Añade y valida al menos dos marcas de referencia. Cada marca puede aportar uno o dos colores.';$('#competencia').scrollIntoView({behavior:'smooth'});return}
 const data=Object.fromEntries(new FormData(form).entries());
 const all=competitors.flatMap(b=>b.colors);
 const counts={};all.forEach(c=>{const f=family(c.hex);counts[f]=(counts[f]||0)+1});
 const ordered=Object.entries(counts).sort((a,b)=>b[1]-a[1]);
 const total=all.length,top=ordered[0],concentration=top[1]/total;
 const repeated=ordered.filter(x=>x[1]>1);
 const families=ordered.map(([f,n])=>familyNames[f]+' ('+n+'/'+total+' tonos validados)').join(', ');
 const pairBrands=competitors.filter(b=>b.colors.length===2).length;
 $('[data-result-brand]').textContent=data.brandName;
 $('[data-result-intro]').textContent='Lectura exploratoria para '+data.brandName+' en '+data.sector+', considerando el público ('+data.audience+') y la personalidad buscada ('+data.personality+').';
 $('[data-observation]').textContent='En esta muestra de '+competitors.length+' marcas se han validado '+total+' tonos: '+families+'. '+(pairBrands?pairBrands+' marcas aparecen con dos colores corporativos validados; se conserva esa relación en el mapa. ':'')+(repeated.length?'Las familias que se repiten son '+repeated.map(x=>familyNames[x[0]]).join(', ')+'. ':'No hay una familia repetida con claridad en la muestra. ')+'Esto permite describir coincidencias dentro de las referencias elegidas, pero no medir por sí solo la saturación de todo el mercado.';
 let interpretation;
 if(concentration>=.55) interpretation='La muestra presenta una concentración apreciable en '+familyNames[top[0]]+'. Esto puede hacer que una nueva marca situada en esa misma zona necesite construir singularidad mediante matiz, composición, tipografía y códigos de aplicación; no implica que deba evitarla. ';
 else interpretation='La muestra no se organiza alrededor de una única familia dominante. Esa diversidad reduce la utilidad de buscar una diferenciación basada solo en “elegir otro color”; conviene definir primero qué percepción necesita ocupar la marca. ';
 interpretation+='El briefing pide transmitir '+data.values+' y proyectar una imagen '+data.personality+'. La tensión estratégica que merece explorarse es cómo expresar esos atributos sin caer en los clichés visuales que el público ya asocia a la categoría. Los logotipos no revelan por qué sus propietarios eligieron esos tonos: esa explicación requeriría investigación de marca, comunicación y audiencia.';
 $('[data-interpretation]').textContent=interpretation;
 renderCompetitorWheel(competitors);
 const routes=makeRouteSet(data,competitors);
 renderTerritoryWheel(routes,competitors);
 $('[data-recommendation-title]').textContent='No decidir por oposición: decidir por posicionamiento.';
 $('[data-recommendation]').textContent='Antes de escoger un color, contrasta las tres direcciones con la promesa real del producto, la sensibilidad del público y los contextos de uso. La ruta más valiosa no será necesariamente la menos frecuente: será la que consiga expresar '+data.values+' con credibilidad y una voz visual reconocible. La muestra actual sirve para formular hipótesis, no para declarar una oportunidad de mercado probada.';
 results.hidden=false;status.textContent='Análisis preparado con '+competitors.length+' marcas y '+total+' colores validados.';results.scrollIntoView({behavior:'smooth',block:'start'});
}
$('[data-analyze]').addEventListener('click',analyze);
$('[data-print]').addEventListener('click',()=>window.print());
$('[data-edit]').addEventListener('click',()=>$('#briefing').scrollIntoView({behavior:'smooth'}));
})();