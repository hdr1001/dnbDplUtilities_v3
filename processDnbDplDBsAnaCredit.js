// *********************************************************************
//
// Process D&B Direct+ data blocks to the AnaCredit format
// JavaScript code file: processDnbDplDBsAnaCredit.js
//
// Copyright 2023 Hans de Rooij
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
import { RateLimiter } from 'limiter';

import { dnbDplDBs } from './sharedDnbDplDBs.js';

const readFileLimiter = new RateLimiter({ tokensPerInterval: 100, interval: 'second' });
const filePath = { root: '', dir: './out' };

const nullUndefToEmptyStr = elem => elem === null || elem === undefined ? '' : elem;

// Convert the D&B Direct+ data blocks to an array of values
function anaCreditLayout(oDnbDplDBs, header) {
    let arrValues = [];

    // Customer reference should be specified in the HTTP request
    arrValues.push(header ? oDnbDplDBs.map121.custRef.desc : oDnbDplDBs.map121.custRef.path);

    // Timestamp dating the D&B Direct+ REST request
    arrValues.push(header ? 'date requested' : oDnbDplDBs.transactionTimestamp());

    // DUNS requested
    arrValues.push(header ? oDnbDplDBs.map121.inqDuns.desc : oDnbDplDBs.map121.inqDuns.path);

    // DUNS delivered
    arrValues.push(header ? oDnbDplDBs.map121.duns.desc : oDnbDplDBs.map121.duns.path);

    // LEI placeholder
    arrValues.push(header ? 'LEI' : 'LEI placeholder');

    // List the entities external registration numbers & associated types
    arrValues = arrValues.concat( oDnbDplDBs.regNumsToArray( [oDnbDplDBs.const.regNum.component.num, oDnbDplDBs.const.regNum.component.ecbType], 2, header ) );

    // Linkage DUNS
    const corpLinkages = oDnbDplDBs.corpLinkage();

    arrValues.push(header ? 'hq or immediate parent duns' : corpLinkages[oDnbDplDBs.const.corpLinkage.oneLevelUp]?.duns);
    arrValues.push(header ? 'hq' : corpLinkages[oDnbDplDBs.const.corpLinkage.oneLevelUp]?.hq);
    arrValues.push(header ? 'hq or immediate parent name' : corpLinkages[oDnbDplDBs.const.corpLinkage.oneLevelUp]?.primaryName);
    arrValues.push(header ? 'global ultimate parent duns' : corpLinkages[oDnbDplDBs.const.corpLinkage.gblUlt]?.duns);
    arrValues.push(header ? 'global ultimate parent name' : corpLinkages[oDnbDplDBs.const.corpLinkage.gblUlt]?.primaryName);

    arrValues.push(header ? oDnbDplDBs.map121.primaryName.desc : oDnbDplDBs.map121.primaryName.path);
    arrValues = arrValues.concat(
        oDnbDplDBs.addrToArray(
            oDnbDplDBs.const.addr.type.primary,
            [
                oDnbDplDBs.const.addr.component.line1,
                oDnbDplDBs.const.addr.component.line2,
                oDnbDplDBs.const.addr.component.postalcode,
                oDnbDplDBs.const.addr.component.locality,
                oDnbDplDBs.const.addr.component.regionAbbr,
                oDnbDplDBs.const.addr.component.countryISO
            ],
            header
    ));

    // ECB legal form
    const ecbLegalForm = oDnbDplDBs.getEcbLegalForm();

    arrValues.push(header ? 'ECB legal form' : ecbLegalForm?.ecbLegalFormCode);
    arrValues.push(header ? 'ECB legal form desc' : ecbLegalForm?.desc);

    return arrValues;
}

// Read the D&B Direct+ data block files
fs.readdir(path.format(filePath))
    .then(arrFiles => {
        let listHeader = true;

        if(arrFiles.length === 0) {
            console.error(`No files available in ${filePath}`);
            return;
        }

        arrFiles
            .filter(fn => fn.endsWith('.json'))
            .forEach(fn => 
                readFileLimiter.removeTokens(1)
                    .then(() => {
                        fs.readFile(path.format({ ...filePath, base: fn }))
                            .then(dbFile => {
                                const oDnbDplDBs = Object.create(dnbDplDBs);

                                try{
                                    oDnbDplDBs.init(dbFile);
                                }
                                catch(err) {
                                    console.error(err);
                                    console.error(oDnbDplDBs.err);
                                    return;
                                }

                                if(listHeader) {
                                    console.log(anaCreditLayout(oDnbDplDBs, listHeader).map(nullUndefToEmptyStr).join('|'));
                                    listHeader = false;
                                }

                                console.log(anaCreditLayout(oDnbDplDBs).map(nullUndefToEmptyStr).join('|'));
                            })
                            .catch(err => console.error(err.message))
                    })
                    .catch(err => console.error(err.message))
            )
    })
    .catch(err => console.error(err.message));
