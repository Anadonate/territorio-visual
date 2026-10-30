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
function setBackground(entry,hex,confidence){
 const root=entry.querySelector('[data-background-control]');
 if(!root)return;
 if(!hexPattern.test(hex||'')){root.hidden=true;return}
 root.hidden=false;
 root.querySelector('[data-background-picker]').value=hex;
 root.querySelector('[data-background-hex]').value=hex.toUpperCase();
 root.querySelector('[data-background-include]').checked=false;
 root.querySelector('[data-background-source]').textContent='Fondo detectado · confianza '+confidence+'. Inclúyelo solo si es parte de la identidad visual.';
}
function getColors(entry){
 const colors=['a','b','c'].map(slot=>{
  const root=entry.querySelector('[data-color-slot="'+slot+'"]');
  const hex=root.querySelector('[data-hex]').value.trim();
  return {hex:hex.toUpperCase(),included:root.querySelector('[data-include]').checked&&hexPattern.test(hex),slot};
 }).filter(x=>x.included);
 const bg=entry.querySelector('[data-background-control]');
 if(bg&&!bg.hidden&&bg.querySelector('[data-background-include]').checked){
  const hex=bg.querySelector('[data-background-hex]').value.trim();
  if(hexPattern.test(hex))colors.push({hex:hex.toUpperCase(),included:true,slot:'fondo'});
 }
 return colors;
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
   const extracted=window.TerritorioColor.extractColors(loaded.image,'exclude');
   if(url)URL.revokeObjectURL(url);url=loaded.previewUrl;
   preview.replaceChildren();const img=document.createElement('img');img.src=url;img.alt='Vista previa del logotipo';preview.append(img);title.textContent=f.name;
   entry.querySelector('[data-color-control]').hidden=false;
   const foreground=(extracted.colors||[]).slice(0,3);
   ['a','b','c'].forEach((slot,i)=>{
    const color=foreground[i];
    const root=entry.querySelector('[data-color-slot="'+slot+'"]');
    if(color)setSlot(entry,slot,color.hex,'Tono '+(i+1)+' detectado en el logotipo · '+Math.round((color.share||0)*100)+'% del área analizada · confirma');
    else{
     root.querySelector('[data-hex]').value='';
     root.querySelector('[data-color-source]').textContent='No se ha detectado un tono adicional. Puedes introducirlo manualmente.';
     root.querySelector('[data-include]').checked=false;
    }
   });
   setBackground(entry,extracted.background,extracted.backgroundConfidence);
   setStatus(entry,'Se han propuesto hasta tres tonos del logotipo. El fondo se analiza por separado y aparece desactivado inicialmente. Revisa qué colores pertenecen realmente a la identidad de esta marca.');
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
 const bg=entry.querySelector('[data-background-control]');
 if(bg){
  const picker=bg.querySelector('[data-background-picker]'),hex=bg.querySelector('[data-background-hex]');
  picker.addEventListener('input',()=>{hex.value=picker.value.toUpperCase();setStatus(entry,'Fondo ajustado manualmente. Decide si es un color corporativo o solo el fondo del archivo.')});
  hex.addEventListener('change',()=>{const value=hex.value.trim();if(!hexPattern.test(value)){hex.setAttribute('aria-invalid','true');setStatus(entry,'Introduce un HEX válido para el fondo.',true);return}hex.removeAttribute('aria-invalid');picker.value=value;hex.value=value.toUpperCase()});
 }
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
 svg.setAttribute('viewBox','0 0 440 440');svg.setAttribute('role','img');svg.setAttribute('aria-label','Rueda cromática de tonos');
 const polarPoint=(angle,r)=>({x:220+Math.cos(angle*Math.PI/180)*r,y:220+Math.sin(angle*Math.PI/180)*r});
 for(let h=0;h<360;h+=15){
  const a1=h-90,a2=h+15-90,p1=polarPoint(a1,178),p2=polarPoint(a2,178);
  const d='M 220 220 L '+p1.x+' '+p1.y+' A 178 178 0 0 1 '+p2.x+' '+p2.y+' Z';
  svg.append(svgEl('path',{d,fill:'hsl('+((h+7.5)%360)+' 72% 57%)','fill-opacity':.22,stroke:'#fff','stroke-width':1}));
 }
 [45,90,135,180].forEach(r=>svg.append(svgEl('circle',{cx:220,cy:220,r,fill:'none',stroke:'#c9c0b4','stroke-width':.8})));
 for(let a=0;a<360;a+=30){const t=(a-90)*Math.PI/180;svg.append(svgEl('line',{x1:220+Math.cos(t)*45,y1:220+Math.sin(t)*45,x2:220+Math.cos(t)*180,y2:220+Math.sin(t)*180,stroke='#b9afa2','stroke-width':.8,'stroke-opacity':.7}))}
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
 const profile=keywordProfile(data), colors=competitors.flatMap(b=>b.colors.map(c=>({...c,brand:b.name,h:hue(c.hex)}))).filter(c=>c.h!==null);
 const distance=(a,b)=>Math.abs(((a-b+540)%360)-180);
 const familyNamesByHue=h=>h<18||h>=345?'rojo':h<45?'naranja':h<68?'amarillo':h<160?'verde':h<205?'turquesa':h<255?'azul':h<290?'violeta':'magenta';
 const ranked=[...colors].sort((a,b)=>distance(a.h,profile.h)-distance(b.h,profile.h)), affinity=ranked[0]||{hex:'#2764A8',h:215,brand:'referencia de apoyo'};
 const used=colors.map(c=>c.h), candidates=Array.from({length:72},(_,i)=>i*5);
 const distinct=candidates.map(h=>({h,nearest:used.length?Math.min(...used.map(x=>distance(h,x))):180})).sort((a,b)=>b.nearest-a.nearest);
 const accentHue=distinct.find(x=>distance(x.h,profile.h)<110)?.h??(profile.h+65)%360, altHue=(profile.h+135)%360;
 const main1=window.TerritorioColor.adjustOklch(affinity.hex,{L:.57,C:Math.min(.19,window.TerritorioColor.toOklch(affinity.hex).C),h:affinity.h});
 const accent=window.TerritorioColor.adjustOklch('#C06A72',{L:.62,C:.15,h:accentHue});
 const color2=window.TerritorioColor.adjustOklch('#6C9C9A',{L:.56,C:.13,h:accentHue}), color3=window.TerritorioColor.adjustOklch('#B28A56',{L:.58,C:.12,h:altHue});
 const support=(hex,h,light=.76)=>window.TerritorioColor.adjustOklch(hex,{L:light,C:Math.min(.12,window.TerritorioColor.toOklch(hex).C*.62),h});
 const semantic={215:'Los azules suelen asociarse con estabilidad, competencia y confianza; su uso extendido exige una ejecución propia.',145:'Los verdes pueden sugerir equilibrio, crecimiento, cuidado y naturaleza; no equivalen automáticamente a sostenibilidad.',265:'Los violetas pueden aportar imaginación y singularidad; su efecto depende de saturación, tono y códigos gráficos.',35:'Los naranjas y ocres pueden comunicar energía y cercanía; un uso muy brillante puede restar sobriedad.',345:'Rojos y magentas concentran atención e intensidad; en algunos sectores pueden leerse como alerta.'};
 const meaning=h=>semantic[[215,145,265,35,345].sort((a,b)=>distance(h,a)-distance(h,b))[0]];
 return [
 {title:'Afinidad sectorial + acento diferencial',tag:'RECONOCIMIENTO CON FIRMA PROPIA',h:affinity.h,main:main1,support:accent,roles:'60 % color principal · 30 % tono de apoyo · 10 % acento',position:'Conservar una señal cromática reconocible de la categoría y sumar un acento que no aparece entre los colores validados de las referencias. El acento se elige por su relación con los valores y la personalidad de la marca, no por contraste arbitrario.',why:'La referencia más próxima al perfil descrito es '+affinity.hex+' ('+familyNamesByHue(affinity.h)+'), presente en '+affinity.brand+'. '+meaning(affinity.h)+' Para '+(data.audience||'el público objetivo')+', esta vía puede equilibrar familiaridad y diferenciación. El acento propuesto ('+accent+') queda fuera de las familias cromáticas detectadas en la muestra; úsalo de forma selectiva en llamadas a la acción, enlaces, pequeños detalles o elementos de señalización.',watch:'Antes de adoptarlo, comprueba que el acento no contradice las connotaciones del sector y que funciona en tamaños pequeños. No lo conviertas en un segundo color dominante: su valor está en la aparición medida.'},
 {title:'Diferenciación dentro de la categoría',tag:'DISTANCIA CON SENTIDO',h:accentHue,main:color2,support:support(color2,accentHue),roles:'60 % color principal · 30 % tono de apoyo · 10 % acento funcional',position:'Desplazarse hacia una familia menos representada en las referencias, conservando una relación con la personalidad que se quiere construir.',why:'La dirección propone '+familyNamesByHue(accentHue)+' para expresar '+profile.label+'. '+meaning(accentHue)+' La intención es ganar reconocimiento frente a esta muestra sin convertir la diferencia en un gesto gratuito. El tono principal lidera; el apoyo puede modular fondos y jerarquías.',watch:'Un hueco en la muestra no demuestra que exista una oportunidad de mercado. Valida la propuesta con personas del público objetivo y en soportes reales.'},
 {title:'Un territorio más propio',tag:'PERSONALIDAD Y MEMORABILIDAD',h:altHue,main:color3,support:support(color3,altHue,.78),roles:'60 % color principal · 30 % tono de apoyo · 10 % acento funcional',position:'Construir una voz visual más singular desde la personalidad y la promesa de marca, no desde la obligación de escoger el color opuesto al competidor.',why:'Esta vía explora '+familyNamesByHue(altHue)+' como expresión de '+data.personality+'. '+meaning(altHue)+' Puede alejar la marca de los códigos más previsibles si el producto, el tono verbal y la experiencia sostienen esa promesa.',watch:'Es la opción que más exige validación: comprueba que la singularidad no compromete claridad, confianza, legibilidad ni adecuación cultural.'}
 ];
}
function luminance(hex){const v=[0,2,4].map(i=>parseInt(hex.slice(i+1,i+3),16)/255).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4);return .2126*v[0]+.7152*v[1]+.0722*v[2]}
function contrastRatio(a,b){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)}
function contrastLabel(hex,bg){const r=contrastRatio(hex,bg);return r>=4.5?'AA texto normal ('+r.toFixed(2)+':1)':r>=3?'AA texto grande / componentes ('+r.toFixed(2)+':1)':'No alcanza AA ('+r.toFixed(2)+':1)'}
function renderTerritoryWheel(routes,competitors){
 const host=$('[data-routes]');host.replaceChildren();
 const intro=document.createElement('div');intro.className='comparison-wheel-heading';intro.innerHTML='<h3>Mapa comparado: competencia + propuestas</h3><p>Los puntos numerados corresponden a las tres direcciones sugeridas; los puntos conectados conservan los vínculos cromáticos de cada marca.</p>';
 const svg=svgEl('svg',{class:'chromatic-wheel proposal-wheel'});wheelBase(svg);
 competitors.forEach((brand,i)=>{
  const pts=brand.colors.map(c=>({color:c,point:polar(c.hex)}));
  if(pts.length>1)for(let j=1;j<pts.length;j++)svg.append(svgEl('line',{x1:pts[0].point.x,y1:pts[0].point.y,x2:pts[j].point.x,y2:pts[j].point.y,stroke:'#292729','stroke-width':1.3,'stroke-opacity':.45}));
  pts.forEach(p=>svg.append(svgEl('circle',{cx:p.point.x,cy:p.point.y,r:7,fill:p.color.hex,stroke:'#fff','stroke-width':1.5})));
 });
 routes.forEach((r,i)=>{
  const p=polar(r.main,172);
  svg.append(svgEl('circle',{cx:p.x,cy:p.y,r:16,fill:r.main,stroke:'#292729','stroke-width':1.5}));
  const t=svgEl('text',{x:p.x,y:p.y-22,'text-anchor':'middle','font-size':12,fill:'#292729','font-weight':800});t.textContent='0'+(i+1);svg.append(t);
 });
 const legend=document.createElement('div');legend.className='proposal-wheel-legend';
 competitors.forEach((brand,i)=>{
  const row=document.createElement('p');
  const strong=document.createElement('strong');strong.textContent=(i+1)+'. '+brand.name;
  row.append(strong,document.createTextNode(' · '+brand.colors.map(c=>c.hex).join(' / ')));legend.append(row);
 });
 routes.forEach((route,i)=>{
  const row=document.createElement('p');
  const dot=document.createElement('span');dot.className='proposal-dot';dot.style.background=route.main;
  const strong=document.createElement('strong');strong.textContent='0'+(i+1)+' · '+route.title;
  row.append(dot,strong,document.createTextNode(' · '+route.main+(route.support?' + '+route.support:'')));legend.append(row);
 });
 const shell=document.createElement('div');shell.className='proposal-wheel-layout';shell.append(svg,legend);
 const cards=document.createElement('div');cards.className='territory-cards';
 routes.forEach((r,i)=>{
  const card=document.createElement('article');card.className='territory-card';
  const top=document.createElement('p');top.className='route-tag';top.textContent='VÍA 0'+(i+1)+' · '+r.tag;
  const title=document.createElement('h3');title.textContent=r.title;
  const swatches=document.createElement('div');swatches.className='route-colors';
  [{name:'Principal',hex:r.main},{name:'Apoyo',hex:r.support}].filter(x=>x.hex).forEach(x=>{
   const sw=document.createElement('div');sw.className='route-color';sw.style.setProperty('--route-color',x.hex);
   const label=document.createElement('span');label.textContent=x.name;
   const code=document.createElement('strong');code.textContent=x.hex;
   sw.append(label,code);swatches.append(sw);
  });
  const pos=document.createElement('p');pos.textContent=r.position;
  const why=document.createElement('p');why.textContent=r.why;
  const roles=document.createElement('p');roles.className='route-roles';roles.textContent='Proporción orientativa: '+r.roles;
  const contrast=document.createElement('p');contrast.className='route-contrast';contrast.textContent='Contraste sobre blanco: '+contrastLabel(r.main,'#FFFFFF')+'. Sobre oscuro: '+contrastLabel(r.main,'#292729')+'.';
  const watch=document.createElement('p');watch.className='territory-watch';watch.textContent='Punto crítico: '+r.watch;
  card.append(top,title,swatches,roles,pos,why,contrast,watch);cards.append(card);
 });
 const note=document.createElement('p');note.className='wheel-caption';note.textContent='La primera rueda muestra los tonos validados de cada competidor. Esta segunda superpone esos mismos tonos con un color principal por vía y, cuando aporta valor, un tono de apoyo. Son puntos de partida para diseñar, no paletas cerradas.';
 host.append(intro,shell,cards,note);
}
function analyze(){
 if(!form.reportValidity()){form.reportValidity();$('#briefing').scrollIntoView({behavior:'smooth'});return}
 const competitors=entries.map((entry,i)=>({entry,name:entry.querySelector('[data-name]').value.trim()||'Marca '+(i+1),colors:getColors(entry)})).filter(b=>b.colors.length);
 if(competitors.length<2){status.textContent='Añade y valida al menos dos marcas de referencia. Cada marca puede aportar hasta tres colores y un fondo opcional.';$('#competencia').scrollIntoView({behavior:'smooth'});return}
 const data=Object.fromEntries(new FormData(form).entries());
 const all=competitors.flatMap(b=>b.colors);
 const counts={};all.forEach(c=>{const f=family(c.hex);counts[f]=(counts[f]||0)+1});
 const ordered=Object.entries(counts).sort((a,b)=>b[1]-a[1]);
 const total=all.length,top=ordered[0],concentration=top[1]/total;
 const repeated=ordered.filter(x=>x[1]>1);
 const families=ordered.map(([f,n])=>familyNames[f]+' ('+n+'/'+total+' tonos validados)').join(', ');
 const pairBrands=competitors.filter(b=>b.colors.length>=2).length;
 $('[data-result-brand]').textContent=data.brandName;
 $('[data-result-intro]').textContent='Diagnóstico cromático exploratorio para '+data.brandName+' · '+data.sector+' · público: '+data.audience+'.';
 const familySummary=ordered.map(([f,n])=>familyNames[f]+' ('+n+')').join(', ');
 const multi=competitors.filter(b=>b.colors.length>=2).map(b=>b.name+' ('+b.colors.length+' tonos)').join(', ');
 $('[data-observation]').textContent='En las '+competitors.length+' referencias se han validado '+total+' colores corporativos. Las familias presentes son '+familySummary+'. '+(repeated.length?'La repetición más visible se concentra en '+repeated.map(x=>familyNames[x[0]]).join(' y ')+'. ':'No aparece una familia cromática claramente repetida. ')+(multi?'Hay identidades que combinan varios tonos: '+multi+'. ':'')+'La lectura importante no es contar colores de forma aislada, sino observar qué códigos se repiten, cuáles conviven dentro de una misma marca y qué personalidad proyecta el conjunto. Este mapa describe únicamente la muestra aportada; no representa un estudio completo del mercado.';
 const profile=keywordProfile(data);
 const semanticByHue={215:'El azul suele activar asociaciones de confianza, estabilidad y competencia; es útil en servicios donde la seguridad percibida importa, aunque su uso extendido puede volverlo genérico.',145:'El verde puede sugerir equilibrio, crecimiento, cuidado y naturaleza; no equivale automáticamente a sostenibilidad y necesita una promesa verificable.',265:'El violeta puede aportar imaginación, pensamiento no convencional y sofisticación; su efecto depende de saturación, tono y códigos gráficos.',35:'Los naranjas y ocres comunican energía, cercanía y dinamismo; si se intensifican pueden perder sobriedad.',345:'Rojos y magentas concentran atención, intensidad y urgencia; en sectores de riesgo pueden leerse como alerta.'};
 const nearestHue=[215,145,265,35,345].sort((a,b)=>Math.abs(((a-profile.h+540)%360)-180)-Math.abs(((b-profile.h+540)%360)-180))[0];
 const semantic=semanticByHue[nearestHue];
 const concentrationText=concentration>=.55?'La muestra sí presenta una inclinación apreciable hacia '+familyNames[top[0]]+'. No demuestra saturación del sector, pero sí aconseja no recurrir a una solución cromática indiferenciada dentro de esta selección.':'La muestra no está dominada por una única familia. Por eso, diferenciarse no consiste simplemente en escoger el color menos frecuente: hay que decidir qué percepción debe liderar la marca.';
 $('[data-interpretation]').textContent='El briefing pide transmitir '+data.values+' y construir una personalidad '+data.personality+'. Para '+data.brandName+', dirigida a '+data.audience+', el criterio cromático debe resolver una tensión: resultar pertinente para la categoría sin adoptar una estética prestada. '+semantic+' '+concentrationText+' La familia que mejor conecta, como hipótesis inicial, con el perfil descrito es '+profile.label+'. Conviene comprobarla en aplicaciones reales: el mismo tono puede parecer tecnológico, frío, cercano o institucional según su luminosidad, saturación, tipografía, fotografía y proporción. No podemos atribuir a cada competidor una intención estratégica solo a partir del logotipo; sí podemos evaluar el efecto perceptivo de sus códigos y decidir si conviene compartirlos o desplazarse.';
 renderCompetitorWheel(competitors);
 const routes=makeRouteSet(data,competitors);
 renderTerritoryWheel(routes,competitors);
 const sampleNote=$('[data-sample-warning]');
 if(sampleNote){sampleNote.hidden=competitors.length>2;sampleNote.textContent='Lectura preliminar: solo has comparado dos marcas. Estas referencias permiten iniciar una conversación cromática, pero no describir de forma fiable el paisaje del sector ni sus oportunidades. Añade más marcas antes de extraer conclusiones amplias.';}
 $('[data-recommendation-title]').textContent='Empieza por la afinidad, pero encuentra tu propia firma.';
 $('[data-recommendation]').textContent='La primera vía puede ser un punto de partida razonable si el color de referencia refleja de verdad los valores de '+data.brandName+'. El acento diferencial '+routes[0].support+' debe funcionar como firma selectiva, no como decoración. Antes de decidir, prueba la combinación en logotipo, interfaz, textos, fondos claros y oscuros. Comprueba también la respuesta del público: este análisis propone hipótesis para diseñar y validar, no una decisión automática ni un estudio de mercado.';
 results.hidden=false;status.textContent='Análisis preparado con '+competitors.length+' marcas y '+total+' colores validados.';results.scrollIntoView({behavior:'smooth',block:'start'});
}
$('[data-analyze]').addEventListener('click',analyze);
$('[data-print]').addEventListener('click',()=>window.print());
$('[data-edit]').addEventListener('click',()=>$('#briefing').scrollIntoView({behavior:'smooth'}));
})();