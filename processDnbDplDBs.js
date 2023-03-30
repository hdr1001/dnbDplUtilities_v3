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
import {
    getArrAddr,
    getArrRegNum,
    getArrNumEmpl,
    getArrRevenue,
    getLatestFin,
    getIndCode
} from './sharedFlattenDplObj.js';

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
                                    //Header
                                    //duns|LEI|regNum1|regNum1Desc|regNum2|regNum2Desc|regNum3|regNum3Desc|regNum4|regNum4Desc|
                                    //primaryName|adrLine1|adrLine2|postalCode|adrLocality|adrRegion|adrCountry|legalForm|actCode1|actCode2|
                                    //opStatus|opStatusDate|opSubStatus|hasBankruptcy|hasOpenBankruptcy|hasInsolvency|hasLiquidation|hasSuspensionOfPayments|orgSizeCat|
                                    //indvNumEmplValue|indvNumEmplReliability|indvNumEmplInfoScope|consNumEmplValue|consNumEmplReliability|consNumEmplInfoScope|
                                    //salesRev|totalAssets|currency|units|reliability|scope|stmtFrom|stmtTo|
                                    //hierarchyLevel|treeMembersCount|branchesCount|
                                    //hqParentDuns|hqParentName|hqParentAdrLine1|hqParentAdrLine2|hqParentPostalCode|hqParentAdrLocality|hqParentAdrRegion|hqParentAdrCountry|
                                    //domUltDuns|domUltName|domUltAdrLine1|domUltAdrLine2|domUltPostalCode|domUltAdrLocality|domUltAdrRegion|domUltAdrCountry|
                                    //globalUltDuns|globalUltName|globalUltAdrLine1|globalUltAdrLine2|globalUltPostalCode|globalUltAdrLocality|globalUltAdrRegion|globalUltAdrCountry|

                                    arrValues.push(org.duns); //Universal data-elements, D&B DUNS
/*
                                    arrValues.push('todo_LEI'); //LEI todo

                                    //Company information, registration numbers
                                    arrValues = arrValues.concat(getArrRegNum(org?.registrationNumbers, 4));
*/
                                    arrValues.push(org.primaryName); //Universal data-elements, company name
   
                                    //Company information primary address
                                     arrValues = arrValues.concat(getArrAddr(org?.primaryAddress));
/*
                                    //Company information legal form table 4
                                    arrValues.push(org?.registeredDetails?.legalForm?.dnbCode);

                                    arrValues.push(getIndCode(org?.industryCodes, 29104)); //todo
                                    arrValues.push('todo_ActCode2'); //todo

                                    //Company information, operating status
                                    arrValues.push(org?.dunsControlStatus?.operatingStatus?.description);
                                    arrValues.push(org?.dunsControlStatus?.operatingStatus?.startDate);
                                    arrValues.push(org?.dunsControlStatus?.operatingSubStatus?.description);

                                    //Legal events from the Filings & Events data block
                                    arrValues.push(org?.legalEvents?.hasBankruptcy);
                                    arrValues.push(org?.legalEvents?.bankruptcy?.mostRecentFilingDate);
                                    arrValues.push(org?.legalEvents?.hasOpenBankruptcy);
                                    arrValues.push(org?.legalEvents?.hasInsolvency);
                                    arrValues.push(org?.legalEvents?.insolvency?.mostRecentFilingDate);
                                    arrValues.push(org?.legalEvents?.hasLiquidation);
                                    arrValues.push(org?.legalEvents?.hasSuspensionOfPayments);

                                    //Company information entity size category
                                    arrValues.push(org?.organizationSizeCategory?.description);

                                    //Company information number of employees
                                    arrValues = arrValues.concat(getArrNumEmpl(org?.numberOfEmployees, [9066, 9068]));
                                    arrValues = arrValues.concat(getArrNumEmpl(org?.numberOfEmployees, [9067]));

                                    //Company information yearly revenue
                                    const finValues = getLatestFin(org?.latestFinancials);

                                    if(finValues[2]) { //If currency available, no need to revert to modelled/estimated values 
                                        arrValues = arrValues.concat(finValues)
                                    }
                                    else { //No currency available, revert to modelled/estimated values
                                        arrValues = arrValues.concat(getArrRevenue(org?.financials, [9094, 9093]));
                                    }
                                    
                                    //Hierarchies & connections
                                    arrValues.push(org?.corporateLinkage?.hierarchyLevel);
                                    arrValues.push(org?.corporateLinkage?.globalUltimateFamilyTreeMembersCount);
                                    arrValues.push(org?.corporateLinkage?.branchesCount);

                                    const hierarchyLevels = [
                                        org?.corporateLinkage?.parent,
                                        org?.corporateLinkage?.domesticUltimate,
                                        org?.corporateLinkage?.globalUltimate
                                    ];

                                    if(org?.corporateLinkage?.headQuarter?.duns && !org?.corporateLinkage?.parent?.duns) {
                                        hierarchyLevels[0] = org?.corporateLinkage?.headQuarter
                                    }

                                    hierarchyLevels.forEach(elem => {
                                        arrValues.push(elem?.duns);
                                        arrValues.push(elem?.primaryName);

                                        arrValues = arrValues.concat(getArrAddr(elem?.primaryAddress));
                                    });
/*
                                    if(org.corporateLinkage && org.corporateLinkage
                                        && org.corporateLinkage.familytreeRolesPlayed
                                        && org.corporateLinkage.familytreeRolesPlayed.length) {

                                            arrValues.push(org.corporateLinkage.familytreeRolesPlayed.map(elem => elem.description).join(','))
                                    }
                                    else {
                                        arrValues.push(null)
                                    }
*/
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
