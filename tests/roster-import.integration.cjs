const fs=require('fs'),assert=require('assert/strict'),puppeteer=require('../backend/node_modules/puppeteer');
process.chdir(require('path').resolve(__dirname,'..'));
const fixtureDir=process.env.HLP_SCAN_FIXTURES || 'logs/pdf-fixtures';
const baseUrl=process.env.HLP_TEST_URL || 'http://127.0.0.1:5174';
if (!process.env.HLP_TEST_DATABASE_CONFIRMED) throw new Error('Gunakan database uji terpisah, lalu set HLP_TEST_DATABASE_CONFIRMED=1.');
(async()=>{const browser=await puppeteer.launch({headless:true});try{
const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(baseUrl,{waitUntil:'domcontentloaded'});
const pass=process.env.HLP_TEST_PASSWORD || fs.readFileSync('backend/.env','utf8').split(/\r?\n/).find(x=>x.startsWith('DEFAULT_USER_PASSWORD=')).split('=')[1];await page.type('input[type="text"]','maulana');await page.type('input[type="password"]',pass);await page.click('button[type="submit"]');await page.waitForFunction(()=>!document.querySelector('input[type="password"]'));
await page.evaluate(()=>Array.from(document.querySelectorAll('button')).find(e=>e.innerText.includes('Management Absensi')).click());await page.waitForSelector('input[type="file"][accept=".pdf,.jpg,.jpeg,.png"]');await page.waitForFunction(()=>document.body.innerText.includes('MAULANA HADY'));
const expected=JSON.parse(fs.readFileSync('tests/fixtures/roster-expected.json','utf8'));
for(const [file,month,count] of [['agustus',8,19],['september',9,18]]) {
 const input=await page.$('input[type="file"][accept=".pdf,.jpg,.jpeg,.png"]');
 const saved=page.waitForResponse(r=>r.url().includes('/api/attendance/roster')&&r.request().method()==='PUT',{timeout:120000});
 await input.uploadFile(require('path').resolve(require('path').join(fixtureDir,file+'.pdf')));
 const response=await saved;assert.equal(response.status(),200);await page.waitForFunction(()=>!document.querySelector('[role="status"]'),{timeout:120000});
 const data=await page.evaluate(async(month)=>{const headers={Authorization:'Bearer '+localStorage.getItem('token')};return await(await fetch('/api/attendance/roster?bulan='+month+'&tahun=2026',{headers})).json();},month);
 assert.equal(data.signedPdfInfo.syncedCount,count);assert.equal(data.signedPdfInfo.unreadCells.length,0);
 for(const [name,codes] of Object.entries(expected[file])) {
  const row=(data.entries||data.rows).find(r=>(r.nama||r.namaLengkap)===name);assert.ok(row,name);
  codes.split(' ').forEach((code,i)=>assert.equal((row.shifts||row.days)[String(i+1)],code,`${file}/${name}/${i+1}`));
 }
 const duty=await page.evaluate(async(month)=>{const headers={Authorization:'Bearer '+localStorage.getItem('token')};return await(await fetch('/api/attendance/roster/by-date?day=1&month='+month+'&year=2026&shift=PAGI',{headers})).json();},month);
 if(month===8){assert.ok(duty.apindo.some(p=>p.nama==='EKA YULIANI S.'&&p.kode==='PS'));assert.ok(!duty.apindo.some(p=>p.nama==='AEP MASHUM NURZAMAN'));}
 if(month===9){assert.ok(duty.apindo.some(p=>p.nama==='AEP MASHUM NURZAMAN'&&p.kode==='P'));assert.ok(!duty.apindo.some(p=>p.nama==='RAHMAT D. CAHYO'));}
 console.log(`PASS ${file}: upload, period, ${count} people, persisted shifts and daily attendance API`);
 await page.screenshot({path:'logs/'+file+'-import-ui.png',fullPage:true});
}
await page.reload({waitUntil:'domcontentloaded'});
await page.waitForFunction(()=>Array.from(document.querySelectorAll('button')).some(e=>e.innerText.includes('Management Absensi')));
await page.evaluate(()=>Array.from(document.querySelectorAll('button')).find(e=>e.innerText.includes('Management Absensi')).click());
await page.waitForSelector('input[type="file"][accept=".pdf,.jpg,.jpeg,.png"]');
// Simulate a storage failure: the importer must report an error, never a success.
await page.setRequestInterception(true);
page.on('request',r=>{if(r.url().includes('/api/attendance/roster')&&r.method()==='PUT')r.respond({status:500,contentType:'application/json',body:JSON.stringify({message:'Simulated failure'})});else r.continue();});
await page.waitForFunction(()=>document.body.innerText.includes('MAULANA HADY'));
const before=await page.$$eval('select',els=>els.slice(0,2).map(el=>el.value));
await (await page.$('input[type="file"][accept=".pdf,.jpg,.jpeg,.png"]')).uploadFile(require('path').resolve(require('path').join(fixtureDir,'agustus.pdf')));
await page.waitForFunction(()=>document.body.innerText.includes('Gagal menyimpan jadwal absensi'),{timeout:120000});
assert.ok(!(await page.$eval('body',e=>e.innerText)).includes('Jadwal Agustus 2026 tersimpan:'));
assert.deepEqual(await page.$$eval('select',els=>els.slice(0,2).map(el=>el.value)),before);
console.log('PASS failed save: visible error, unchanged period, no success claim');
// A blank image must fail without a PUT request or a fabricated default schedule.
let saves=0;page.on('request',r=>{if(r.method()==='PUT'&&r.url().includes('/api/attendance/roster'))saves++;});
await page.evaluate(async()=>{
  const c=document.createElement('canvas');c.width=1800;c.height=1200;
  const ctx=c.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,c.width,c.height);
  const blob=await new Promise(resolve=>c.toBlob(resolve));
  const dt=new DataTransfer();dt.items.add(new File([blob],'blank.png',{type:'image/png'}));
  const input=document.querySelector('input[type="file"][accept=".pdf,.jpg,.jpeg,.png"]');input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));
});
await page.waitForFunction(()=>document.body.innerText.includes('Tabel atau periode dokumen belum terbaca'),{timeout:120000});
assert.equal(saves,0);console.log('PASS unreadable image: rejected without saving');
assert.equal(errors.length,0,errors.join('\n'));
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
