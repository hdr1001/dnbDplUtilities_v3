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
import { getArrAddr } from './sharedFlattenDplObj.js';

const readFileLimiter = new RateLimiter({ tokensPerInterval: 100, interval: 'second' });

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

                                let arrValues = [];

                                if(org) {
                                    //Universal data-elements
                                    arrValues.push(org.duns);
                                    arrValues.push(org.primaryName);
    
                                    //Company information
                                    arrValues.push(org?.dunsControlStatus?.operatingStatus?.description);

                                    //Company information primary address
                                    arrValues = arrValues.concat(getArrAddr(org?.primaryAddress));

                                    //Hierarchies & connections
                                    arrValues.push(org?.corporateLinkage?.hierarchyLevel);
                                    arrValues.push(org?.corporateLinkage?.globalUltimateFamilyTreeMembersCount);
                                    arrValues.push(org?.corporateLinkage?.branchesCount);

                                    const ftRoles = org?.corporateLinkage?.familytreeRolesPlayed;
                                    let isGlobalUlt = ftRoles && ftRoles.findIndex(elem => elem.description === 'Global Ultimate') !== -1;

                                    const hierarchyLevels = [
                                        org?.corporateLinkage?.headQuarter,
                                        org?.corporateLinkage?.parent,
                                        org?.corporateLinkage?.domesticUltimate,
                                        org?.corporateLinkage?.globalUltimate
                                    ];

                                    if(isGlobalUlt) { hierarchyLevels[1] = org?.corporateLinkage?.domesticUltimate }

                                    hierarchyLevels.forEach(elem => {
                                        arrValues.push(elem?.duns);
                                        arrValues.push(elem?.primaryName);

                                        arrValues = arrValues.concat(getArrAddr(elem?.primaryAddress));
                                    });

                                    if(org.corporateLinkage && org.corporateLinkage
                                        && org.corporateLinkage.familytreeRolesPlayed
                                        && org.corporateLinkage.familytreeRolesPlayed.length) {

                                            arrValues.push(org.corporateLinkage.familytreeRolesPlayed.map(elem => elem.description).join(','))
                                    }
                                    else {
                                        arrValues.push(null)
                                    }
                                } 
                                else {
                                    const dbsError = dbs.error;

                                    if(dbsError) {
                                        arrValues.push(dbs?.inquiryDetail?.duns);
                                        arrValues.push(dbsError?.errorMessage);
                                        arrValues.push('????');
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
