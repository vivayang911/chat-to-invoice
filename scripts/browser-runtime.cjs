const path=require('node:path');
const {createRequire}=require('node:module');
module.exports=function loadPlaywright(){
 try{return require('playwright');}catch(error){if(error.code!=='MODULE_NOT_FOUND')throw error;}
 const directory=process.env.CODEX_NODE_MODULES||'C:/Users/P15v/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
 try{return createRequire(path.join(directory,'playwright/package.json'))('playwright');}catch{throw Error('Browser checks require Playwright. Install it locally with npm install --no-save --package-lock=false playwright, then npx playwright install chromium.');}
};
