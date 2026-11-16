import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root=fileURLToPath(new URL('../',import.meta.url));
const bundled='C:/Users/T460s/.cache/codex-runtimes/codex-primary-runtime/dependencies/native/git/cmd/git.exe';
const git=existsSync(bundled)?bundled:'git';
function run(repo,args,input){return execFileSync(git,['-c','http.sslBackend=openssl','-c',`safe.directory=${repo.replaceAll('\\','/')}`,...args],{cwd:repo,input,encoding:'utf8',maxBuffer:16*1024*1024,windowsHide:true});}
const reports=[];
for(const [name,branch] of [['bomerp-backend','master'],['bomerp-frontend','frontend']]) {
  const repo=path.join(root,name);
  const remote=run(repo,['ls-remote','--heads','origin',`refs/heads/${branch}`]).split(/\s/)[0];
  const head=run(repo,['rev-parse','HEAD']).trim();
  const entries=run(repo,['ls-tree','-r','-z',head]).split('\0').filter(Boolean).map(l=>{
    const [meta,file]=l.split('\t');return {path:file,hash:meta.split(' ')[2]};
  });
  const missing=entries.filter(e=>!existsSync(path.join(repo,e.path))).map(e=>e.path);
  const present=entries.filter(e=>existsSync(path.join(repo,e.path)));
  const hashes=run(repo,['hash-object','--stdin-paths'],present.map(e=>JSON.stringify(e.path)).join('\n')+'\n').trim().split(/\r?\n/);
  const changed=present.filter((e,i)=>e.hash!==hashes[i]).map((e,i)=>e.path);
  const fsck=run(repo,['fsck','--full']).trim();
  const report={carpeta:name,rama:branch,remote,head,commitsIguales:remote===head,archivos:entries.length,faltantes:missing,contenidoDistinto:changed,fsck:fsck||'OK',historialCompleto:run(repo,['rev-parse','--is-shallow-repository']).trim()==='false',estado:run(repo,['status','--short']).trim(),manifest:entries};
  reports.push(report);
  console.log(JSON.stringify({...report,manifest:undefined},null,2));
}
if(reports.some(r=>!r.commitsIguales||r.faltantes.length||r.contenidoDistinto.length))process.exitCode=1;
