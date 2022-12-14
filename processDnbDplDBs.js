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

const readFileLimiter = new RateLimiter({ tokensPerInterval: 100, interval: 'second' });

const filePath = { root: '', dir: 'out' };

const nullUndefToEmptyStr = elem => elem === null || elem === undefined ? '' : elem;

//D&B data block address object to array conversion
function getArrAddr(oAddr) {
    //Check if an object is an empty object
    function bIsEmptyObj(obj) {
        let bRet = false;
    
        try {
            if(obj === null || typeof obj === 'undefined' ||
                    (obj.constructor === Object && Object.keys(obj).length === 0)) {
        
                bRet = true;
            }
        }
        catch(err) {
            console.log('Parameter passed into function bIsEmptyObj is not an object')
        }
    
        return bRet;
    }

    let arrAddr = [], str = '';
 
    if(!oAddr) {return arrAddr}
 
    //Street address
    if(oAddr.streetAddress) {
        if(oAddr.streetAddress.line1) {arrAddr.push(oAddr.streetAddress.line1)}
        if(oAddr.streetAddress.line2) {arrAddr.push(oAddr.streetAddress.line2)}
    }
 
    //Refer to alternative properties if streetAddress doesn't contain info
    if(arrAddr.length === 0) {
        if(oAddr.streetName) {
            str = oAddr.streetName;

            if(oAddr.streetNumber) {
                str += ' ' + oAddr.streetNumber
            }

            arrAddr.push(str);

            str = '';
        }
    }
 
    //Postalcode & city
    if(oAddr.postalCode) {str = oAddr.postalCode}

    if(!bIsEmptyObj(oAddr.addressLocality)) {
        str.length > 0 ? str += ' ' + oAddr.addressLocality.name : str = oAddr.addressLocality.name
    }

    if(!bIsEmptyObj(oAddr.addressRegion) && oAddr.addressRegion.abbreviatedName) {
        str.length > 0 ? str += ' (' + oAddr.addressRegion.abbreviatedName + ')' : str = oAddr.addressRegion.abbreviatedName
    }

    if(str.length > 0) {arrAddr.push(str)}
 
    //Country
    if(oAddr.addressCountry && oAddr.addressCountry.name) {arrAddr.push(oAddr.addressCountry.name)}
 
    //Is registered address
    if(oAddr.isRegisteredAddress) {
        arrAddr.push('Entity registered at this address');
    }
 
    return arrAddr;
}

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
                                    //Universal data-elements
                                    arrValues.push(org.duns);
                                    arrValues.push(org.primaryName);
                                    arrValues.push(org.countryISOAlpha2Code);
    
                                    //Company information
                                    arrValues.push(org?.dunsControlStatus?.operatingStatus?.description);

                                    console.log(getArrAddr(org.primaryAddress));

                                    //Hierarchies & connections
                                    arrValues.push(org?.corporateLinkage?.hierarchyLevel);
                                    arrValues.push(org?.corporateLinkage?.globalUltimateFamilyTreeMembersCount);
                                    arrValues.push(org?.corporateLinkage?.branchesCount);

                                    const hierarchyLevels = [
                                        org?.corporateLinkage?.headQuarter,
                                        org?.corporateLinkage?.parent,
                                        org?.corporateLinkage?.domesticUltimate,
                                        org?.corporateLinkage?.globalUltimate
                                    ];

                                    hierarchyLevels.forEach(elem => {
                                        arrValues.push(elem?.duns);
                                        arrValues.push(elem?.primaryName);
                                        console.log(getArrAddr(elem?.primaryAddress));
                                        arrValues.push(elem?.primaryAddress?.addressCountry?.isoAlpha2Code);
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
