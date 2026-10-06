import {existsSync,mkdirSync,readdirSync,readFileSync,statSync,writeFileSync} from 'node:fs';
import {join,relative,resolve} from 'node:path';
import {gzipSync} from 'node:zlib';

const root=resolve(process.argv[2]??'dist');
const maxJsBytes=Number(process.env.DOODLEGAME_JS_BUDGET_BYTES??1_500_000);
if(!Number.isFinite(maxJsBytes)||maxJsBytes<=0)throw new Error('DOODLEGAME_JS_BUDGET_BYTES must be a positive number.');
if(!existsSync(root))throw new Error(`Build directory does not exist: ${root}`);

const walk=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
 const path=join(dir,entry.name);
 return entry.isDirectory()?walk(path):[path];
});
const jsFiles=walk(root).filter(path=>path.endsWith('.js'));
if(jsFiles.length===0)throw new Error('No JavaScript bundles found in dist.');

const rows=jsFiles.map(path=>{
 const bytes=statSync(path).size;
 const gzipBytes=gzipSync(readFileSync(path)).length;
 return{path:relative(root,path),bytes,gzipBytes};
}).sort((a,b)=>b.bytes-a.bytes);

const totalBytes=rows.reduce((sum,row)=>sum+row.bytes,0);
const totalGzipBytes=rows.reduce((sum,row)=>sum+row.gzipBytes,0);
const report=[
 `budget_bytes=${maxJsBytes}`,
 `total_js_bytes=${totalBytes}`,
 `total_js_gzip_bytes=${totalGzipBytes}`,
 ...rows.map(row=>`${row.path}\t${row.bytes}\t${row.gzipBytes}`)
].join('\n')+'\n';

mkdirSync('artifacts/core-vitals',{recursive:true});
writeFileSync('artifacts/core-vitals/bundle-metrics.txt',report);
process.stdout.write(report);

if(totalBytes>maxJsBytes){
 console.error(`JavaScript bundle budget exceeded: ${totalBytes} > ${maxJsBytes} bytes.`);
 process.exitCode=1;
}
