// *********************************************************************
//
// D&B Direct+ utilities, get reference data as pipe delimited list
// JavaScript code file: dnbDplRefData.js
//
// Copyright 2022 Hans de Rooij
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//       http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND,
// either express or implied. See the License for the specific
// language governing permissions and limitations under the
// License.
//
// *********************************************************************

import { dnbDplHttpAttr, Https } from './sharedLib.js';

let httpAttr = null, bCategories = false;

if(process.argv && process.argv[2]) {
    httpAttr = { ...dnbDplHttpAttr, path: '/v1/referenceData/category' };

    httpAttr.path +=  '?' + new URLSearchParams({ id: process.argv[2] }).toString();
}
else {
    bCategories = true;

    httpAttr = { ...dnbDplHttpAttr, path: '/v1/referenceData/categories' };
}

function doList(retBuff) {
    let oCat = null;

    try {
        oCat = JSON.parse(retBuff)
    }
    catch(err) {
        return err.message
    }

    if(bCategories) {
        return oCat.codeTables.map(oCodeTbl => oCodeTbl.categoryID + '|' + oCodeTbl.categoryName).join('\n')
    }
    else {
        return oCat.codeTables[0].codeLists.map(oCat => oCat.code + '|'  + oCat.description).join('\n')
    }
}

new Https(httpAttr).execReq()
    .then(ret => console.log(doList(ret.buffBody)))
    .catch(err => console.error(err.message));
