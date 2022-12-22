// *********************************************************************
//
// D&B Direct+ utilities, IDentity Resolution in batch
// JavaScript code file: dnbDplIdrInBatch.js
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

import * as path from 'path';
import { promises as fs } from 'fs';
import { dnbDplHttpAttr, Https } from './sharedLib.js';
import { readInpFile } from './sharedReadInpFile.js';

//Defaults for reading and writing files
const filePathIn  = { root: '', dir: 'in', base: 'IDR.txt' };
const filePathOut = { root: '', dir: 'out' };

//Output file name prefix & extension
const fbPrefix    = 'dpl_idr_';
const fbExt       = '.json';

//Read & parse the IDentity Resolution criteria
const arrCriteria = readInpFile(filePathIn, '|');

//Construct the output file name
function getFileBase(fbCriteriaID, httpStatus) {
    if(httpStatus !== 200) {
        fbCriteriaID = `${fbCriteriaID}_${httpStatus}`
    } 

    return fbPrefix + fbCriteriaID + fbExt;
}

arrCriteria.forEach((idrCriteria, idx) => {
    const httpAttr = { ...dnbDplHttpAttr, path: '/v1/match/cleanseMatch' };

    httpAttr.path += '?' + new URLSearchParams(idrCriteria).toString();

    const fbCriteriaID = idrCriteria.customerReference5 ? idrCriteria.customerReference5 : `row_${idx + 1}`;

    new Https(httpAttr).execReq()
        .then(ret => {
            const filePath = {
                ...filePathOut,
                base: getFileBase(fbCriteriaID, ret.httpStatus)
            }

            fs.writeFile(path.format(filePath), ret.buffBody)
                .then( console.log(`Wrote file ${filePath.base} successfully`) )
                .catch(err => console.error(err.message));
        })
        .catch(err => console.error(err));
});
