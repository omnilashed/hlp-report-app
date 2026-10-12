import { createWorker, PSM, type Worker } from 'tesseract.js';
import * as pdfjs from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

export type ShiftCode = 'P' | 'PS' | 'M' | 'L' | '-' | 'CUTI' | 'DL';
export interface ImportPerson { nama: string; nik?: string; _id?: string }
export interface ImportRow { nama: string; nik: string; shifts: Record<string, ShiftCode>; unreadDays: number[] }
export interface RosterImport {
  month: number; year: number; rows: ImportRow[]; warnings: string[]; pagePreviewUrl: string;
}
const MONTHS = ['JANUARI','FEBRUARI','MARET','APRIL','MEI','JUNI','JULI','AGUSTUS','SEPTEMBER','OKTOBER','NOVEMBER','DESEMBER'];
export const nameKey = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '');
export function readPeriod(text: string): {month: number; year: number} | null {
  const t = text.toUpperCase();
  const month = MONTHS.findIndex(m => new RegExp(`\\b${m}\\b`).test(t));
  const year = t.match(/\b(20\d{2})\b/) || t.match(/TAHUN\D*1?(20\d{2})/);
  return month >= 0 && year ? {month: month + 1, year: Number(year[1])} : null;
}
function distance(a: string, b: string): number {
  let prev = Array.from({length:b.length+1},(_,i)=>i);
  for (let i=1;i<=a.length;i++) {
    const next=[i];
    for(let j=1;j<=b.length;j++) next[j]=Math.min(next[j-1]+1,prev[j]+1,prev[j-1]+Number(a[i-1]!==b[j-1]));
    prev=next;
  }
  return prev[b.length];
}
export function matchPerson(text: string, people: ImportPerson[]): ImportPerson | undefined {
  const key=nameKey(text.replace(/^\s*\d+\s*/,''));
  const digits=text.replace(/\D/g,'');
  const byNik=people.filter(p=>p.nik && p.nik.replace(/\D/g,'').length>=6 && digits.includes(p.nik.replace(/\D/g,'')));
  if(byNik.length===1) return byNik[0];
  const exact=people.filter(p=>key.includes(nameKey(p.nama)));
  if(exact.length===1) return exact[0];
  const letters=key.replace(/\d/g,'');
  const candidates=people.map(p=>({p,score:distance(letters,nameKey(p.nama))/Math.max(letters.length,nameKey(p.nama).length)})).sort((a,b)=>a.score-b.score);
  if(candidates[0]?.score<=0.18 && (!candidates[1] || candidates[1].score-candidates[0].score>=0.12)) return candidates[0].p;
}
function canvas(w:number,h:number): HTMLCanvasElement {
  const c=document.createElement('canvas'); c.width=Math.max(1,Math.round(w)); c.height=Math.max(1,Math.round(h));
  const ctx=c.getContext('2d')!; ctx.fillStyle='white'; ctx.fillRect(0,0,c.width,c.height); return c;
}
function crop(source:HTMLCanvasElement,x:number,y:number,w:number,h:number,scale=1) {
  const c=canvas(w*scale,h*scale); c.getContext('2d')!.drawImage(source,x,y,w,h,0,0,c.width,c.height); return c;
}
function rotate(source:HTMLCanvasElement,angle:number) {
  const swap=angle%180!==0;
  const c=canvas(swap?source.height:source.width,swap?source.width:source.height);
  const ctx=c.getContext('2d')!; ctx.translate(c.width/2,c.height/2);ctx.rotate(angle*Math.PI/180);ctx.drawImage(source,-source.width/2,-source.height/2);return c;
}
function groups(values:number[],threshold:number):number[] {
  const out:number[]=[];let start=-1;
  for(let i=0;i<=values.length;i++) {
    if(i<values.length && values[i]>=threshold) { if(start<0)start=i; }
    else if(start>=0) { let sum=0,weight=0; for(let j=start;j<i;j++){sum+=j*values[j];weight+=values[j];} out.push(sum/weight);start=-1; }
  }
  return out.reduce<number[]>((merged, value) => {
    if(merged.length && value-merged[merged.length-1]<7) merged[merged.length-1]=(merged[merged.length-1]+value)/2;
    else merged.push(value);
    return merged;
  },[]);
}
export interface Grid { xs:number[]; ys:number[]; left:number; right:number }
// Locate printed rules; no fixed person order, month or page coordinates.
export function detectGrid(c:HTMLCanvasElement):Grid | null {
  const {width:w,height:h}=c;
  const data=c.getContext('2d',{willReadFrequently:true})!.getImageData(0,0,w,h).data;
  const dark=(x:number,y:number)=> {const i=(y*w+x)*4;return (data[i]+data[i+1]+data[i+2])/3<185 && Math.max(data[i],data[i+1],data[i+2])-Math.min(data[i],data[i+1],data[i+2])<50;};
  const row=new Array(h).fill(0);
  for(let y=0;y<h;y++) for(let x=0;x<w;x+=2) if([-3,0,3].some(dy=>y+dy>=0&&y+dy<h&&dark(x,y+dy)))row[y]+=2;
  const ys=groups(row,w*0.64);
  if(ys.length<8)return null;
  const top=Math.floor(ys[0]),bottom=Math.ceil(ys[ys.length-1]);
  const col=new Array(w).fill(0);
  for(let x=0;x<w;x++)for(let y=top;y<bottom;y+=2)if([-2,0,2].some(dx=>x+dx>=0&&x+dx<w&&dark(x+dx,y)))col[x]+=2;
  const lines=groups(col,(bottom-top)*0.60);
  let best:number[]=[];
  for(let i=0;i<lines.length-1;i++) {
    const gap=lines[i+1]-lines[i]; if(gap<w/65 || gap>w/20)continue;
    const run=[lines[i],lines[i+1]];
    for(let j=i+2;j<lines.length;j++) {if(Math.abs((lines[j]-run[run.length-1])-gap)>gap*0.2)break;run.push(lines[j]);}
    if(run.length>best.length)best=run;
  }
  if(best.length<29 || best.length>32)return null;
  return {xs:best,ys,left:lines[0],right:lines[lines.length-1]};
}
function tsvWords(tsv:string) {
  return tsv.split('\n').slice(1).flatMap(line=> {
    const p=line.split('\t'); if(p[0]!=='5'||!p[11]?.trim())return [];
    return [{text:p.slice(11).join('\t').trim(),x:+p[6],y:+p[7],w:+p[8],h:+p[9],confidence:+p[10]}];
  });
}
async function recognize(worker:Worker,c:HTMLCanvasElement,mode=PSM.SINGLE_BLOCK) {
  await worker.setParameters({tessedit_pageseg_mode:mode,tessedit_char_whitelist:'',user_defined_dpi:'300'});
  return (await worker.recognize(c,{}, {text:true,tsv:true})).data;
}
function cellInk(source:HTMLCanvasElement,x:number,y:number,w:number,h:number) {
  const insetX=Math.max(2,w*0.1),insetY=Math.max(2,h*0.15);
  const c=crop(source,x+insetX,y+insetY,w-2*insetX,h-2*insetY,3);
  const ctx=c.getContext('2d')!;const im=ctx.getImageData(0,0,c.width,c.height);
  const levels:number[]=[]; for(let i=0;i<im.data.length;i+=16)levels.push((im.data[i]+im.data[i+1]+im.data[i+2])/3);
  levels.sort((a,b)=>a-b); const bg=levels[Math.floor(levels.length*0.7)]; const threshold=Math.min(145,bg*0.68);
  let minX=c.width,maxX=-1,minY=c.height,maxY=-1,ink=0;
  const colors:{[key:string]:number}={P:0,PS:0,M:0,CUTI:0};
  for(let i=0;i<im.data.length;i+=4) {
    const [r,g,b]=[im.data[i],im.data[i+1],im.data[i+2]];
    if(r>180&&g>130&&b<180&&r-b>50){if(r-g>32)colors.P++;else colors.PS++;}
    if(b>140&&b-r>40&&b>g-20)colors.M++;
    if(g>100&&g-r>12&&g-b>25)colors.CUTI++;
    const black=(r+g+b)/3<threshold;
    const px=(i/4)%c.width,py=Math.floor(i/4/c.width);
    if(black){minX=Math.min(minX,px);maxX=Math.max(maxX,px);minY=Math.min(minY,py);maxY=Math.max(maxY,py);ink++;}
    im.data[i]=im.data[i+1]=im.data[i+2]=black?0:255;
  }
  // Discard isolated scan speckles before measuring tiny '-' glyphs.
  const visited=new Uint8Array(c.width*c.height);const components:number[][]=[];
  for(let pos=0;pos<visited.length;pos++) {
    if(visited[pos]||im.data[pos*4]!==0)continue;
    const component:number[]=[];const queue=[pos];visited[pos]=1;
    for(let q=0;q<queue.length;q++) {
      const at=queue[q];component.push(at);const ax=at%c.width,ay=Math.floor(at/c.width);
      for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]]) {
        const nx=ax+dx,ny=ay+dy,np=ny*c.width+nx;
        if(nx>=0&&nx<c.width&&ny>=0&&ny<c.height&&!visited[np]&&im.data[np*4]===0){visited[np]=1;queue.push(np);}
      }
    }
    components.push(component);
  }
  const largest=Math.max(0,...components.map(a=>a.length));
  minX=c.width;maxX=-1;minY=c.height;maxY=-1;ink=0;
  for(const component of components) {
    const touchesEdge=component.some(pos=>pos%c.width<=1 || pos%c.width>=c.width-2 || Math.floor(pos/c.width)<=1 || Math.floor(pos/c.width)>=c.height-2);
    const keep=component.length>=Math.max(5,largest*0.12);
    const centerX=component.reduce((sum,pos)=>sum+pos%c.width,0)/component.length;
    const centerY=component.reduce((sum,pos)=>sum+Math.floor(pos/c.width),0)/component.length;
    const measure=!touchesEdge || (centerX>c.width*0.15&&centerX<c.width*0.85&&centerY>c.height*0.15&&centerY<c.height*0.85);
    for(const pos of component) {
      if(!keep){im.data[pos*4]=im.data[pos*4+1]=im.data[pos*4+2]=255;continue;}
      if(!measure)continue;
      const px=pos%c.width,py=Math.floor(pos/c.width);minX=Math.min(minX,px);maxX=Math.max(maxX,px);minY=Math.min(minY,py);maxY=Math.max(maxY,py);ink++;
    }
  }
  ctx.putImageData(im,0,0);
  const dominant=Object.entries(colors).sort((a,b)=>b[1]-a[1])[0];
  const color=dominant[1]>c.width*c.height*0.23?dominant[0] as ShiftCode:undefined;
  const dash=ink>5 && (maxX-minX+1)/(maxY-minY+1)>1.1 && (maxY-minY)<c.height*0.26;
  return {image:c,color,dash,ink};
}
export async function parseRosterCanvas(source:HTMLCanvasElement,people:ImportPerson[],worker:Worker,onProgress:(s:string)=>void):Promise<RosterImport> {
  let oriented=source,period:ReturnType<typeof readPeriod>=null,grid:Grid|null=null;
  for(const angle of [0,90,270,180]) {
    const candidate=angle===0?source:rotate(source,angle);
    if(candidate.width<candidate.height)continue;
    const candidateGrid=detectGrid(candidate); if(!candidateGrid)continue;
    const header=crop(candidate,0,0,candidate.width,candidateGrid.ys[0]);
    const text=(await recognize(worker,header,PSM.SPARSE_TEXT)).text;
    const found=readPeriod(text);
    if(found){oriented=candidate;grid=candidateGrid;period=found;break;}
  }
  if(!grid||!period)throw new Error('Tabel atau periode dokumen belum terbaca. Gunakan scan yang jelas dengan seluruh tabel dan judul bulan/tahun.');
  const days=new Date(period.year,period.month,0).getDate();
  if(grid.xs.length-1!==days)throw new Error(`Jumlah kolom tanggal (${grid.xs.length-1}) tidak sesuai periode dokumen (${days} hari). Jadwal tidak diubah.`);
  const warnings:string[]=[];const rows:ImportRow[]=[];
  const strips:Array<{y:number;h:number;image:HTMLCanvasElement}>=[];
  for(let i=0;i<grid.ys.length-1;i++) {
    const y=grid.ys[i],h=grid.ys[i+1]-y;
    if(h<oriented.height*0.007||h>oriented.height*0.08)continue;
    strips.push({y,h,image:crop(oriented,grid.left+3,y+3,grid.xs[0]-grid.left-6,h-6,2)});
  }
  // Remove table rules and give each row its own whitespace so names and NIKs stay together.
  const labels=canvas(Math.max(...strips.map(s=>s.image.width))+40,strips.length*90);
  const labelCtx=labels.getContext('2d')!;
  strips.forEach((s,i)=>labelCtx.drawImage(s.image,20,i*90+15,s.image.width,50));
  const labelData=await recognize(worker,labels,PSM.SPARSE_TEXT);
  const words=tsvWords(labelData.tsv || '');
  const matched=new Set<string>();
  for(let i=0;i<strips.length;i++) {
    const text=words.filter(w=>Math.floor((w.y+w.h/2)/90)===i).map(w=>w.text).join(' ');
    const person=matchPerson(text,people);
    if(!person) { if(/\d{6,}/.test(text.replace(/\s/g,'')))warnings.push(`Personil tidak cocok dengan akun aktif: ${text}`);continue; }
    if(matched.has(nameKey(person.nama)))throw new Error(`Nama ${person.nama} terbaca lebih dari sekali. Jadwal tidak diubah.`);
    matched.add(nameKey(person.nama));
    onProgress(`Membaca ${person.nama} (${rows.length+1})...`);
    const strip=strips[i]; const cells=Array.from({length:days},(_,d)=>cellInk(oriented,grid!.xs[d],strip.y,grid!.xs[d+1]-grid!.xs[d],strip.h));
    const atlas=canvas(1600,Math.ceil(days/16)*100);const ac=atlas.getContext('2d')!;
    cells.forEach((cell,d)=> { const ratio=Math.min(70/cell.image.width,65/cell.image.height);ac.drawImage(cell.image,(d%16)*100+15,Math.floor(d/16)*100+15,cell.image.width*ratio,cell.image.height*ratio);});
    const data=await recognize(worker,atlas,PSM.SPARSE_TEXT);
    const tokens=tsvWords(data.tsv||''); const shifts:Record<string,ShiftCode>={},unreadDays:number[]=[];
    cells.forEach((cell,d)=> {
      const token=tokens.filter(t=>Math.floor((t.x+t.w/2)/100)===d%16 && Math.floor((t.y+t.h/2)/100)===Math.floor(d/16)).map(t=>t.text).join('').toUpperCase().replace(/[^A-Z-]/g,'');
      let code:ShiftCode|undefined;
      if(cell.color==='CUTI')code='CUTI';
      else if(['P','PS','M','L','DL','CUTI','-'].includes(token))code=token as ShiftCode;
      else if(cell.color)code=cell.color;
      else if(cell.dash)code='-';
      if(code){shifts[String(d+1)]=code;shifts[String(d+1).padStart(2,'0')]=code;}else unreadDays.push(d+1);
    });
    rows.push({nama:person.nama,nik:person.nik||'',shifts,unreadDays});
  }
  if(!rows.length)throw new Error('Tidak ada nama/NIK personil aktif yang terbaca. Jadwal tidak diubah.');
  return {...period,rows,warnings,pagePreviewUrl:crop(oriented,0,0,oriented.width,oriented.height,Math.min(1,1400/oriented.width)).toDataURL('image/jpeg',0.8)};
}
export async function readRosterFile(file:File,people:ImportPerson[],onProgress:(s:string)=>void):Promise<RosterImport> {
  if(file.size>30*1024*1024)throw new Error('Ukuran dokumen maksimal 30 MB.');
  onProgress('Menyiapkan pembaca scan...');
  const base=new URL(`${import.meta.env.BASE_URL}ocr/`,location.href).href;
  const worker=await createWorker('eng',1,{workerPath:base+'worker.min.js',corePath:base,langPath:base.slice(0,-1)});
  try {
    const results:RosterImport[]=[];
    if(/\.pdf$/i.test(file.name)) {
      const loadingTask=pdfjs.getDocument({data:await file.arrayBuffer()}); const pdf=await loadingTask.promise;
      try {
        if(pdf.numPages>10)throw new Error('Maksimal 10 halaman per dokumen jadwal.');
        for(let n=1;n<=pdf.numPages;n++) {
          onProgress(`Membaca halaman ${n}/${pdf.numPages}...`);
          const page=await pdf.getPage(n);const v=page.getViewport({scale:1});
          const view=page.getViewport({scale:3000/Math.max(v.width,v.height)});const c=canvas(view.width,view.height);
          await page.render({canvas:c,canvasContext:c.getContext('2d')!,viewport:view}).promise;
          results.push(await parseRosterCanvas(c,people,worker,onProgress));page.cleanup();
        }
      } finally {await loadingTask.destroy();}
    } else {
      const bitmap=await createImageBitmap(file);
      try {const scale=Math.min(2,3000/Math.max(bitmap.width,bitmap.height));const c=canvas(bitmap.width*scale,bitmap.height*scale);c.getContext('2d')!.drawImage(bitmap,0,0,c.width,c.height);results.push(await parseRosterCanvas(c,people,worker,onProgress));}finally{bitmap.close();}
    }
    const result=results[0];const seen=new Set(result.rows.map(r=>nameKey(r.nama)));
    for(const next of results.slice(1)) {
      if(next.month!==result.month||next.year!==result.year)throw new Error('Dokumen berisi beberapa periode. Impor satu periode sekaligus.');
      for(const row of next.rows){if(seen.has(nameKey(row.nama)))throw new Error(`Nama ${row.nama} berulang pada beberapa halaman.`);seen.add(nameKey(row.nama));result.rows.push(row);}
      result.warnings.push(...next.warnings);
    }
    return result;
  } finally {await worker.terminate();}
}



