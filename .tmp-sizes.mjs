import fs from 'fs';
import { initializeApp } from 'firebase/app';
import { initializeFirestore, collection, getDocs } from 'firebase/firestore';
const src=fs.readFileSync('./src/app/core/firebase/firebase.config.ts','utf8');
const cfg={}; for(const m of src.matchAll(/(\w+):\s*'([^']+)'/g)) cfg[m[1]]=m[2];
const db=initializeFirestore(initializeApp(cfg),{ignoreUndefinedProperties:true});
const snap=await getDocs(collection(db,'products'));
for(const d of snap.docs){const p=d.data(); console.log(p.name, '| price', p.price, '| size', p.size, '| sizes', p.sizes?Object.keys(p.sizes):'none');}
process.exit(0);
