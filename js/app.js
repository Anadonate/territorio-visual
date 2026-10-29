(() => {
const entries=[...document.querySelectorAll('[data-entry="competitor"]')];
const results=document.querySelector('[data-results]');
const status=document.querySelector('[data-global-status]');
const hexPattern=/^#[0-9a-f]{6}$/i;
const form=document.querySelector('[data-brief]');
const $=(s)=>document.querySelector(s);
function setStatus(entry,msg,error=false){const el=entry.querySelector('[data-status]');el.textContent=msg;el.classList.toggle('is-error',error)}
function setColor(entry,hex,msg){entry.querySelector('[data-color-control]').hidden=false;entry.querySelector('[data-picker]').value=hex;entry.querySelector('[data-hex]').value=hex.toUpperCase();entry.dataset.color=hex.toUpperCase();setStatus(entry,msg||'Color estimado. Comprueba que representa el color principal de esta identidad.')}
entries.forEach(entry=>{
 const file=entry.querySelector('[data-file]'),name=entry.querySelector('[data-name]'),preview=entry.querySelector('[data-preview]'),title=entry.querySelector('[data-upload-title]'),picker=entry.querySelector('[data-picker]'),hex=entry.querySelector('[data-hex]');let url=null,token=0;
 file.addEventListener('change',async()=>{const f=file.files&&file.files[0];if(!f)return;const t=++token;title.textContent='Analizando…';setStatus(entry,'Estimando el color con más presencia.');
 try{const loaded=await window.TerritorioColor.loadLogo(f);if(t!==token){URL.revokeObjectURL(loaded.previewUrl);return}const extracted=window.TerritorioColor.extractColors(loaded.image);if(url)URL.revokeObjectURL(url);url=loaded.previewUrl;preview.replaceChildren();const img=document.createElement('img');img.src=url;img.alt='Vista previa del logotipo';preview.append(img);title.textContent=f.name;setColor(entry,extracted.colors[0].hex,'Color dominante estimado. Revísalo: puede corresponder al fondo o a un detalle del logo.')}catch(e){title.textContent='No se pudo leer el archivo';setStatus(entry,e.message||'Prueba con un PNG o JPEG.',true)}});
 picker.addEventListener('input',()=>{hex.value=picker.value.toUpperCase();entry.dataset.color=picker.value.toUpperCase();setStatus(entry,'Color corregido manualmente.')});
 hex.addEventListener('change',()=>{const v=hex.value.trim();if(!hexPattern.test(v)){hex.setAttribute('aria-invalid','true');setStatus(entry,'Introduce un HEX válido, por ejemplo #EA5A77.',true);return}hex.removeAttribute('aria-invalid');setColor(entry,v,'Color corregido manualmente.')});
});
function family(hex){const c=window.TerritorioColor.toOklch(hex);if(c.h===null||c.C<.035)return c.L<.23?'negro':c.L>.91?'blanco':'neutro';const h=c.h;if(h<18||h>=345)return'rojo/rosa';if(h<45)return'naranja';if(h<68)return'amarillo';if(h<160)return'verde';if(h<205)return'turquesa';if(h<255)return'azul';if(h<290)return'violeta';if(h<325)return'magenta';return'rojo/rosa'}
function familyLabel(f){return({'rojo/rosa':'rojos y rosas',naranja:'naranjas',amarillo:'amarillos',verde:'verdes',turquesa:'turquesas',azul:'azules',violeta:'violetas',magenta:'magenta',negro:'negros',blanco:'blancos',neutro:'neutros'})[f]||f}
function rgbToHex(r,g,b){return'#'+[r,g,b].map(x=>Math.round(x).toString(16).padStart(2,'0')).join('').toUpperCase()}
function hsl(h,s,l){h=((h%360)+360)%360;s/=100;l/=100;const a=s*Math.min(l,1-l),f=n=>{const k=(n+h/30)%12;return l-a*Math.max(-1,Math.min(k-3,9-k,1))};return rgbToHex(f(0)*255,f(8)*255,f(4)*255)}
function hue(hex){const c=window.TerritorioColor.toOklch(hex);return c.h===null?210:c.h}
function esc(text){return String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function palette(base,offsets){return offsets.map((o,i)=>hsl(base+o,[64,48,35][i]||45,[43,59,76][i]||55))}
function renderBoard(items){const board=$('[data-board]');board.replaceChildren();items.forEach(item=>{const card=document.createElement('article');card.className='comparison-item';const sw=document.createElement('div');sw.className='comparison-swatch';sw.style.background=item.hex;sw.style.color=(()=>{const c=window.TerritorioColor.toOklch(item.hex);return c.L>.65?'#292729':'#fff'})();const tag=document.createElement('span');tag.textContent='REFERENCIA';const val=document.createElement('strong');val.textContent=item.hex;sw.append(tag,val);const n=document.createElement('h4');n.textContent=item.name;const f=document.createElement('p');f.textContent=familyLabel(family(item.hex));card.append(sw,n,f);board.append(card)})}
function analyze(){
 if(!form.reportValidity()){form.reportValidity();$('#briefing').scrollIntoView({behavior:'smooth'});return}
 const competitors=entries.filter(e=>hexPattern.test(e.dataset.color||'')).map((e,i)=>({name:e.querySelector('[data-name]').value.trim()||'Marca '+(i+1),hex:e.dataset.color}));
 if(competitors.length<2){status.textContent='Añade al menos dos logotipos de competencia para detectar patrones con algo más de contexto.';$('#competencia').scrollIntoView({behavior:'smooth'});return}
 const data=Object.fromEntries(new FormData(form).entries());const fams=competitors.map(x=>family(x.hex));const counts={};fams.forEach(f=>counts[f]=(counts[f]||0)+1);const dominant=Object.entries(counts).sort((a,b)=>b[1]-a[1])[0];const concentrated=dominant[1]>=Math.ceil(competitors.length*.5);const usedHue=competitors.reduce((a,x)=>a+hue(x.hex),0)/competitors.length;
 const observed=Object.entries(counts).sort((a,b)=>b[1]-a[1]).map(([f,n])=>familyLabel(f)+' ('+n+')').join(', ');
 $('[data-result-brand]').textContent=data.brandName;
 $('[data-result-intro]').textContent='Propuestas iniciales para '+data.brandName+', teniendo en cuenta su sector ('+data.sector+'), el público al que se dirige y la personalidad que quiere construir.';
 $('[data-observation]').textContent='En los '+competitors.length+' logotipos aportados aparecen estas familias cromáticas: '+observed+'. '+(concentrated?'La muestra muestra una concentración relativa en '+familyLabel(dominant[0])+'.':'La muestra está repartida entre varias familias, sin una única familia claramente dominante.')+' Esto describe únicamente las referencias seleccionadas, no todo el sector.';
 $('[data-interpretation]').textContent='La concentración puede reflejar códigos compartidos, convenciones o posicionamientos habituales, pero el color por sí solo no permite saber por qué cada empresa lo eligió. Para '+data.brandName+', la decisión debe cruzar ese contexto con sus valores ('+data.values+') y con la imagen deseada: '+data.personality+'.';
 renderBoard(competitors);
 const values=(data.values+' '+data.personality+' '+data.description).toLowerCase();
 const keywords=[['confianza|seguridad|profesional|experiencia|rigor',215,'Confianza contemporánea'],['natural|sostenib|ecológ|orgán|bienestar|salud',145,'Cercanía natural'],['innov|tecnolog|digital|futur|disrupt|creativ',265,'Innovación expresiva'],['premium|lujo|exclusiv|sofistic|elegan',35,'Sofisticación cálida'],['cercan|amable|accesib|familiar|divertid',345,'Cercanía con carácter']];
 let chosen=keywords.find(k=>new RegExp(k[0]).test(values));let anchor=chosen?chosen[1]:195;
 const baseHue=concentrated?((hue(competitors.find(x=>family(x.hex)===dominant[0]).hex)+360)%360):usedHue;
 const avoidHue=concentrated?baseHue:usedHue;
 const routes=[
 {name:'Afinidad estratégica',tag:'Hablar el lenguaje del sector',h:anchor,desc:'Una ruta que conserva señales cromáticas reconocibles para el mercado, pero permite construir una ejecución propia mediante matiz, luminosidad y combinación.',reason:'Puede ser adecuada si la prioridad es transmitir '+(data.values.split(',')[0]||'confianza')+' y facilitar que el público entienda rápidamente la categoría.'},
 {name:'Diferenciación matizada',tag:'Separarse sin romper el código',h:(avoidHue+48)%360,desc:'Una variación de matiz respecto a la zona cromática más presente en la muestra. La diferenciación no depende de un opuesto automático: se busca una distancia visible pero compatible con la personalidad definida.',reason:'Puede ayudar a crear reconocimiento propio manteniendo una relación visual comprensible con el sector.'},
 {name:'Territorio alternativo',tag:'Una personalidad más singular',h:(anchor+118)%360,desc:'Una ruta más exploratoria que amplía la distancia cromática. Solo tiene sentido si la personalidad, la propuesta de valor y las expectativas del público justifican apartarse de los códigos habituales.',reason:'No se propone por contraste decorativo: sería una opción si '+data.brandName+' necesita expresar una posición claramente distinta y puede sostenerla en todos sus puntos de contacto.'}
 ];
 if(chosen&&chosen[2]==='Cercanía natural')routes[0].h=145;
 if(chosen&&chosen[2]==='Innovación expresiva')routes[0].h=265;
 const routesEl=$('[data-routes]');routesEl.innerHTML='';
 routes.forEach((r,i)=>{const colors=palette(r.h,[0,18,-16]);const card=document.createElement('article');card.className='route-card';const sw=document.createElement('div');sw.className='route-swatches';colors.forEach((c,j)=>{const s=document.createElement('span');s.style.background=c;s.innerHTML='<b>'+['Principal','Secundario','Apoyo'][j]+'</b><small>'+c+'</small>';sw.append(s)});const top=document.createElement('p');top.className='route-tag';top.textContent='RUTA 0'+(i+1)+' · '+r.tag;const title=document.createElement('h3');title.textContent=r.name;const desc=document.createElement('p');desc.textContent=r.desc;const reason=document.createElement('p');reason.className='route-reason';reason.textContent=r.reason;card.append(top,title,sw,desc,reason);routesEl.append(card)});
 $('[data-recommendation-title]').textContent=concentrated?'Explorar una diferencia de matiz antes de romper con el código del sector.':'Elegir entre afinidad y diferenciación según la personalidad prioritaria.';
 $('[data-recommendation]').textContent='Como primer territorio de trabajo, compara la ruta 02 con la ruta 01 en aplicaciones reales. '+(concentrated?'La concentración cromática observada sugiere que merece la pena probar una variación propia dentro de una lógica reconocible. ':'La diversidad de la muestra permite explorar distintas familias, pero conviene elegir según el posicionamiento y no solo por ser diferente. ')+'Contrasta las opciones con el público objetivo y revisa legibilidad, accesibilidad, reproducción y convivencia con fotografía e ilustración. La selección de matiz es una hipótesis inicial, no una conclusión estadística.';
 results.hidden=false;status.textContent='Análisis preparado con '+competitors.length+' referencias.';results.scrollIntoView({behavior:'smooth',block:'start'});
}
$('[data-analyze]').addEventListener('click',analyze);
$('[data-print]').addEventListener('click',()=>window.print());
$('[data-edit]').addEventListener('click',()=>$('#briefing').scrollIntoView({behavior:'smooth'}));
})();