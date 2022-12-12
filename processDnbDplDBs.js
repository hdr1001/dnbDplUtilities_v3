// *********************************************************************
//
// Process D&B Direct+ data blocks written to files
// JavaScript code file: processDnbDplDBs.js
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
import { RateLimiter } from 'limiter';

const readFileLimiter = new RateLimiter({ tokensPerInterval: 50, interval: 'second' });

const filePath = { root: '', dir: 'out' };

const nullUndefToEmptyStr = elem => elem === null || elem === undefined ? '' : elem;

fs.readdir(path.format(filePath))
    .then(arrFiles => 
        arrFiles
            .filter(fn => fn.endsWith('.json'))
            .filter(fn => fn.indexOf('dnb_dpl_cmpbo') === -1)
            .filter(fn => fn.indexOf('dnb_dpl_full_fam') === -1)
            .forEach(fn => 
                readFileLimiter.removeTokens(1)
                    .then(() => {
                        fs.readFile(path.format({ ...filePath, base: fn }))
                            .then(file => {
                                let dbs;

                                try {
                                    dbs = JSON.parse(file)
                                }
                                catch(err) {
                                    console.error(err.message);
                                    return;
                                }

                                const org = dbs.organization;

                                const arrValues = [];

                                if(org) {
                                    arrValues.push(org.duns);
                                    arrValues.push(org.primaryName);
                                    arrValues.push(org.countryISOAlpha2Code);
    
                                    arrValues.push(org?.dunsControlStatus?.operatingStatus?.description)
                                }
                                else {
                                    const dbsError = dbs.error;

                                    if(dbsError) {
                                        arrValues.push(dbs?.inquiryDetail?.duns);
                                        arrValues.push(dbsError?.errorMessage);
                                        arrValues.push('😞');
                                    }
                                }

                                console.log(arrValues.map(nullUndefToEmptyStr).join('|'));
                            })
                            .catch(err => console.error(err.message))
                    })
                    .catch(err => console.error(err.message))
            )
    )
    .catch(err => console.error(err.message));
