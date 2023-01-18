// *********************************************************************
//
// Process D&B Direct+ IDentity Resolution responses
// JavaScript code file: processDnbDplIDR.js
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
import { getArrAddr } from './sharedFlattenDplObj.js';

const readFileLimiter = new RateLimiter({ tokensPerInterval: 100, interval: 'second' });

const filePath = { root: '', dir: 'out' };

const nullUndefToEmptyStr = elem => elem === null || elem === undefined ? '' : elem;

fs.readdir(path.format(filePath))
    .then(arrFiles => 
        arrFiles
            .filter(fn => fn.endsWith('.json'))
            .filter(fn => fn.indexOf('dpl_idr') > -1)
            .forEach(fn => 
                readFileLimiter.removeTokens(1)
                    .then(() => {
                        fs.readFile(path.format({ ...filePath, base: fn }))
                            .then(file => {
                                let idrResp;

                                try {
                                    idrResp = JSON.parse(file)
                                }
                                catch(err) {
                                    console.error(err.message);
                                    return;
                                }

                                const mcs = idrResp.matchCandidates;

                                let arrValues = [];

                                //Echo IDentity Resolution input
                                arrValues.push(idrResp?.inquiryDetail?.customerReference[0]);
                                arrValues.push(idrResp?.inquiryDetail?.customerReference[1]);
                                
                                if(mcs && mcs.length) {
                                    const org = mcs[0].organization;

                                    //Universal data-elements
                                    arrValues.push(org.duns);
                                    arrValues.push(org.primaryName);
    
                                    //Company information
                                    arrValues.push(org?.dunsControlStatus?.operatingStatus?.description);

                                    //Company information primary address
                                    arrValues = arrValues.concat(getArrAddr(org?.primaryAddress));

                                    //Registration number
                                    arrValues.push(org?.registrationNumbers[0]?.registrationNumber);

                                    //MatchGrade & confidence code
                                    const qlty = mcs[0].matchQualityInformation;

                                    arrValues.push(qlty?.matchGrade)
                                    arrValues.push(qlty?.confidenceCode)
                                } 
                                else {
                                    const idrRespError = idrResp.error;

                                    if(idrRespError) {
                                        arrValues.push(idrRespError?.errorMessage);
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
